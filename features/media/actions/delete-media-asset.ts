"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";

export type DeleteMediaResult = { success: boolean; message?: string };

/**
 * Deletes a media asset: removes Storage object and metadata.
 * Requires owner or admin role.
 */
export async function deleteMediaAssetAction(
  tenantSlug: string,
  assetId: string
): Promise<DeleteMediaResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Verify owner/admin
  const { data: membership } = await supabase
    .from("tenant_members").select("id, role")
    .eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can delete media." };
  }

  // Load asset
  const { data: asset } = await supabase.from("media_assets").select("id, storage_path, tenant_id")
    .eq("id", assetId).eq("tenant_id", tenant.id).single();

  if (!asset) return { success: false, message: "Media not found." };

  // Delete storage object
  const { error: storageError } = await supabase.storage.from("business-media").remove([asset.storage_path]);
  if (storageError) {
    console.error("[delete-media] Storage error:", storageError.message);
    // Continue to delete metadata anyway
  }

  // Delete metadata
  const { error: metaError } = await supabase.from("media_assets").delete().eq("id", assetId).eq("tenant_id", tenant.id);
  if (metaError) {
    console.error("[delete-media] Metadata error:", metaError.code, metaError.message);
    return { success: false, message: "Unable to delete media." };
  }

  revalidatePath(`/${tenantSlug}/settings/media`);
  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/resources`);

  return { success: true, message: "Media deleted." };
}
