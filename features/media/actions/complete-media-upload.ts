"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { SINGLE_IMAGE_ROLES, type MediaRole, type MediaTarget } from "../types/media";

export type CompleteUploadResult = {
  success: boolean;
  message?: string;
  assetId?: string;
};

/**
 * Records media metadata after a successful Storage upload.
 * Atomically replaces single-image roles (logo, cover, profile).
 */
export async function completeMediaUploadAction(
  tenantSlug: string,
  params: {
    target: MediaTarget;
    targetId: string | null;
    mediaRole: MediaRole;
    storagePath: string;
    originalFilename: string | null;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    altText: string | null;
  }
): Promise<CompleteUploadResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Verify owner/admin
  const { data: membership } = await supabase
    .from("tenant_members").select("id, role")
    .eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can manage media." };
  }

  // Verify path starts with tenant ID
  if (!params.storagePath.startsWith(tenant.id)) {
    return { success: false, message: "Invalid storage path." };
  }

  // Determine location_id and resource_id
  let locationId: string | null = null;
  let resourceId: string | null = null;

  if (params.target === "location" && params.targetId) {
    const { data: loc } = await supabase.from("locations").select("id").eq("id", params.targetId).eq("tenant_id", tenant.id).single();
    if (!loc) return { success: false, message: "Location not found." };
    locationId = params.targetId;
  } else if (params.target === "resource" && params.targetId) {
    const { data: res } = await supabase.from("resources").select("id").eq("id", params.targetId).eq("tenant_id", tenant.id).single();
    if (!res) return { success: false, message: "Resource not found." };
    resourceId = params.targetId;
  }

  // For single-image roles, delete old metadata + storage object
  if (SINGLE_IMAGE_ROLES.includes(params.mediaRole)) {
    const query = supabase.from("media_assets").select("id, storage_path")
      .eq("tenant_id", tenant.id).eq("media_role", params.mediaRole);

    if (locationId) query.eq("location_id", locationId);
    else query.is("location_id", null);

    if (resourceId) query.eq("resource_id", resourceId);
    else query.is("resource_id", null);

    const { data: existing } = await query;

    if (existing && existing.length > 0) {
      for (const old of existing) {
        await supabase.storage.from("business-media").remove([old.storage_path]);
        await supabase.from("media_assets").delete().eq("id", old.id);
      }
    }
  }

  // Determine sort_order for gallery
  let sortOrder = 0;
  if (params.mediaRole === "gallery") {
    const countQuery = supabase.from("media_assets").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id).eq("media_role", "gallery");
    if (locationId) countQuery.eq("location_id", locationId);
    else countQuery.is("location_id", null);
    if (resourceId) countQuery.eq("resource_id", resourceId);
    else countQuery.is("resource_id", null);
    const { count } = await countQuery;
    sortOrder = (count ?? 0) + 1;
  }

  // Insert metadata
  const { data: inserted, error } = await supabase.from("media_assets").insert({
    tenant_id: tenant.id,
    location_id: locationId,
    resource_id: resourceId,
    media_role: params.mediaRole,
    storage_bucket: "business-media",
    storage_path: params.storagePath,
    original_filename: params.originalFilename?.slice(0, 255) ?? null,
    mime_type: params.mimeType,
    size_bytes: params.sizeBytes,
    width: params.width,
    height: params.height,
    alt_text: params.altText?.slice(0, 250) ?? null,
    caption: null,
    is_primary: SINGLE_IMAGE_ROLES.includes(params.mediaRole),
    sort_order: sortOrder,
    created_by: user.id,
  }).select("id").single();

  if (error || !inserted) {
    // Cleanup: try to remove the uploaded object
    await supabase.storage.from("business-media").remove([params.storagePath]);
    console.error("[complete-media-upload] Insert error:", error?.code, error?.message);
    return { success: false, message: "Unable to save media. The uploaded file has been removed." };
  }

  revalidatePath(`/${tenantSlug}/settings/media`);
  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/resources`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  return { success: true, assetId: inserted.id };
}
