"use server";

/**
 * Server action to save tenant booking rules — Milestone 6.8.
 *
 * Uses upsert (insert on conflict update) to handle both initial creation
 * and subsequent updates in a single operation.
 *
 * Authorization: owner or admin only.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { tenantBookingRulesSchema } from "../schemas/booking-rules-schema";
import type { TenantBookingRulesFormValues } from "../schemas/booking-rules-schema";

export type SaveTenantBookingRulesResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveTenantBookingRulesAction(
  tenantSlug: string,
  values: Record<string, unknown>
): Promise<SaveTenantBookingRulesResult> {
  // 1. Authenticate
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  // 2. Resolve tenant
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active", "trialing"].includes(tenant.status)) {
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

  // 4. Validate input
  let validated: TenantBookingRulesFormValues;
  try {
    validated = await tenantBookingRulesSchema.validate(values, {
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

  // 5. Upsert tenant booking rules
  const { error: upsertError } = await supabase
    .from("tenant_booking_rules")
    .upsert(
      {
        tenant_id: tenant.id,
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
      { onConflict: "tenant_id" }
    );

  if (upsertError) {
    console.error("[save-tenant-booking-rules]", upsertError.code, upsertError.message);
    return { success: false, message: "Unable to save booking rules." };
  }

  // 6. Revalidate
  revalidatePath(`/${tenantSlug}/settings`);
  revalidatePath(`/${tenantSlug}/settings/booking`);

  return { success: true, message: "Booking rules saved." };
}
