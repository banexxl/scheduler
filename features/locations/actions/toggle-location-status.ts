"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { LocationActionResult } from "./create-location";

/**
 * Toggles a location's active/inactive status.
 * Cannot deactivate the primary location.
 */
export async function toggleLocationStatusAction(
  tenantSlug: string,
  locationId: string,
  newStatus: boolean
): Promise<LocationActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();

  // Verify role
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can change location status." };
  }

  // Check location belongs to tenant and is not primary (if deactivating)
  const { data: location } = await supabase
    .from("locations")
    .select("id, is_primary")
    .eq("id", locationId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!location) {
    return { success: false, message: "Location not found." };
  }

  if (location.is_primary && !newStatus) {
    return { success: false, message: "Cannot deactivate the primary location." };
  }

  const { error } = await supabase
    .from("locations")
    .update({ is_active: newStatus })
    .eq("id", locationId)
    .eq("tenant_id", tenant.id);

  if (error) {
    console.error("[toggle-location-status] Error:", error.code, error.message);
    return { success: false, message: "Unable to update location status." };
  }

  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  return { success: true, message: newStatus ? "Location activated." : "Location deactivated." };
}
