"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { LocationActionResult } from "./create-location";

/**
 * Sets a location as the primary location for the business.
 * Uses the set_primary_location RPC for atomicity.
 */
export async function setPrimaryLocationAction(
  tenantSlug: string,
  locationId: string
): Promise<LocationActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();

  // Verify owner/admin role before calling RPC (defense in depth)
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can change the primary location." };
  }

  const { error } = await supabase.rpc("set_primary_location", {
    target_tenant_id: tenant.id,
    target_location_id: locationId,
  });

  if (error) {
    console.error("[set-primary-location] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) {
      return { success: false, message: "Only owners and admins can change the primary location." };
    }
    if (error.message?.includes("not found")) {
      return { success: false, message: "Location not found in this business." };
    }
    return { success: false, message: "Unable to change primary location. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  return { success: true, message: "Primary location updated." };
}
