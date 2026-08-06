"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { ALLOWED_MIME_TYPES, TARGET_ALLOWED_ROLES, MAX_FILE_SIZE_BYTES, MAX_LOGO_SIZE_BYTES, type MediaRole, type MediaTarget } from "../types/media";

export type PrepareUploadResult = {
  success: boolean;
  message?: string;
  uploadPath?: string;
  tenantId?: string;
};

/**
 * Prepares a media upload by verifying authorization and generating a safe storage path.
 * Returns the path the client should upload to.
 */
export async function prepareMediaUploadAction(
  tenantSlug: string,
  target: MediaTarget,
  targetId: string | null,
  mediaRole: MediaRole,
  mimeType: string,
  sizeBytes: number
): Promise<PrepareUploadResult> {
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
    return { success: false, message: "Only owners and admins can upload media." };
  }

  // Validate role for target
  const allowedRoles = TARGET_ALLOWED_ROLES[target];
  if (!allowedRoles?.includes(mediaRole)) {
    return { success: false, message: "Invalid media role for this target." };
  }

  // Validate MIME
  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    return { success: false, message: "Only JPEG, PNG, and WebP images are allowed." };
  }

  // Validate size
  const maxSize = mediaRole === "logo" ? MAX_LOGO_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
  if (sizeBytes > maxSize || sizeBytes <= 0) {
    return { success: false, message: `File size must be between 1 byte and ${Math.round(maxSize / 1024 / 1024)} MB.` };
  }

  // Verify target entity belongs to tenant
  if (target === "location" && targetId) {
    const { data: loc } = await supabase.from("locations").select("id").eq("id", targetId).eq("tenant_id", tenant.id).single();
    if (!loc) return { success: false, message: "Location not found." };
  } else if (target === "resource" && targetId) {
    const { data: res } = await supabase.from("resources").select("id").eq("id", targetId).eq("tenant_id", tenant.id).single();
    if (!res) return { success: false, message: "Resource not found." };
  }

  // Generate safe path
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const uuid = crypto.randomUUID();
  const entityFolder = target === "business" ? "business" : (targetId ?? "unknown");
  const uploadPath = `${tenant.id}/${target}/${entityFolder}/${mediaRole}/${uuid}.${ext}`;

  return { success: true, uploadPath, tenantId: tenant.id };
}
