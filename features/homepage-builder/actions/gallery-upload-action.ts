"use server";

/**
 * Gallery Image Upload Action — prepares a Supabase Storage path
 * for gallery images with the tenant slug in the folder path.
 */

import { requireTenantRole } from "@/lib/tenants/require-tenant-role";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type GalleryUploadPrepareResult =
  | { success: true; uploadPath: string; publicUrl: string }
  | { success: false; message: string };

/**
 * Validates and generates a storage path for a gallery image upload.
 * Path format: {tenantId}/{tenantSlug}/gallery/{uuid}.{ext}
 *
 * The tenant UUID comes first to satisfy Supabase Storage RLS policies,
 * and the slug is included for human-readable folder browsing.
 */
export async function prepareGalleryUploadAction(
  tenantSlug: string,
  mimeType: string,
  sizeBytes: number
): Promise<GalleryUploadPrepareResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return { success: false, message: "Only JPEG, PNG, and WebP images are allowed." };
    }

    if (sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
      return { success: false, message: "File size must be between 1 byte and 5 MB." };
    }

    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const uuid = crypto.randomUUID();
    const uploadPath = `${tenant.id}/${tenantSlug}/gallery/${uuid}.${ext}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/business-media/${uploadPath}`;

    return { success: true, uploadPath, publicUrl };
  } catch {
    return { success: false, message: "Unauthorized." };
  }
}
