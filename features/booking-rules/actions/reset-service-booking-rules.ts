"use server";

/**
 * Server action to reset service booking rules to tenant defaults — Milestone 6.8.
 *
 * Deletes the service override row entirely, making the service inherit
 * all booking rules from the tenant configuration.
 *
 * Authorization: owner or admin, service must belong to tenant.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";

export type ResetServiceBookingRulesResult = {
  success: boolean;
  message?: string;
};

export async function resetServiceBookingRulesAction(
  tenantSlug: string,
  serviceId: string
): Promise<ResetServiceBookingRulesResult> {
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

  // 5. Delete the override row
  const { error } = await supabase
    .from("service_booking_rules")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("service_id", serviceId);

  if (error) {
    console.error("[reset-service-booking-rules]", error.code, error.message);
    return { success: false, message: "Unable to reset service booking rules." };
  }

  // 6. Revalidate
  revalidatePath(`/${tenantSlug}/services/${serviceId}/edit`);
  revalidatePath(`/${tenantSlug}/services/${serviceId}/availability`);

  return { success: true, message: "Service booking rules reset to tenant defaults." };
}
