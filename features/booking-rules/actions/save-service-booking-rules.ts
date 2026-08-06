"use server";

/**
 * Server action to save service booking rule overrides — Milestone 6.8.
 *
 * Uses upsert (insert on conflict update) to handle both initial creation
 * and subsequent updates. Null values mean "inherit from tenant".
 *
 * Authorization: owner or admin, service must belong to tenant.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { serviceBookingRulesSchema } from "../schemas/booking-rules-schema";
import type { ServiceBookingRulesFormValues } from "../schemas/booking-rules-schema";

export type SaveServiceBookingRulesResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveServiceBookingRulesAction(
  tenantSlug: string,
  serviceId: string,
  values: Record<string, unknown>
): Promise<SaveServiceBookingRulesResult> {
  // 1. Authenticate
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  // 2. Resolve tenant
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    return { success: false, message: "Business not found." };
  }

  // 3. Verify owner/admin
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can manage booking rules." };
  }

  // 4. Verify service belongs to tenant
  const { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!service) {
    return { success: false, message: "Service not found." };
  }

  // 5. Validate input
  let validated: ServiceBookingRulesFormValues;
  try {
    validated = await serviceBookingRulesSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => {
        if (e.path) fieldErrors[e.path] = e.message;
      });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  // 6. Upsert service booking rules
  const { error: upsertError } = await supabase
    .from("service_booking_rules")
    .upsert(
      {
        tenant_id: tenant.id,
        service_id: serviceId,
        minimum_notice_minutes: validated.minimumNoticeMinutes,
        maximum_advance_days: validated.maximumAdvanceDays,
        slot_interval_minutes: validated.slotIntervalMinutes,
        cancellation_notice_minutes: validated.cancellationNoticeMinutes,
        reschedule_notice_minutes: validated.rescheduleNoticeMinutes,
        allow_same_day_booking: validated.allowSameDayBooking,
        allow_customer_cancellation: validated.allowCustomerCancellation,
        allow_customer_rescheduling: validated.allowCustomerRescheduling,
        require_customer_phone: validated.requireCustomerPhone,
        require_customer_email: validated.requireCustomerEmail,
        is_active: true,
      },
      { onConflict: "tenant_id,service_id" }
    );

  if (upsertError) {
    if (upsertError.message?.includes("tenant")) {
      return { success: false, message: "Service does not belong to this business." };
    }
    console.error("[save-service-booking-rules]", upsertError.code, upsertError.message);
    return { success: false, message: "Unable to save service booking rules." };
  }

  // 7. Revalidate
  revalidatePath(`/${tenantSlug}/services/${serviceId}/edit`);
  revalidatePath(`/${tenantSlug}/services/${serviceId}/availability`);

  return { success: true, message: "Service booking rules saved." };
}
