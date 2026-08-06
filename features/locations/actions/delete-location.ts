"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { LocationActionResult } from "./create-location";

/**
 * Deletes a location using the delete_business_location RPC.
 * Prevents deletion of primary or last location.
 */
export async function deleteLocationAction(
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

  const { error } = await supabase.rpc("delete_business_location", {
    target_tenant_id: tenant.id,
    target_location_id: locationId,
  });

  if (error) {
    console.error("[delete-location] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) {
      return { success: false, message: "Only owners and admins can delete locations." };
    }
    if (error.message?.includes("primary")) {
      return { success: false, message: "Cannot delete the primary location." };
    }
    if (error.message?.includes("last")) {
      return { success: false, message: "Cannot delete the last location." };
    }
    if (error.message?.includes("not found")) {
      return { success: false, message: "Location not found." };
    }
    return { success: false, message: "Unable to delete location. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  return { success: true, message: "Location deleted." };
}
