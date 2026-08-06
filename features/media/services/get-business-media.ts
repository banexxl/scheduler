import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MediaAsset, MediaRole } from "../types/media";

/**
 * Loads media assets for a business (no location_id, no resource_id).
 */
export async function getBusinessMedia(
  tenantId: string
): Promise<MediaAsset[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("location_id", null)
    .is("resource_id", null)
    .order("media_role", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load business media");

  return (data ?? []).map(mapMediaAsset);
}

/**
 * Loads media assets for a location.
 */
export async function getLocationMedia(
  tenantId: string,
  locationId: string
): Promise<MediaAsset[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .order("media_role", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load location media");

  return (data ?? []).map(mapMediaAsset);
}

/**
 * Loads media assets for a resource.
 */
export async function getResourceMedia(
  tenantId: string,
  resourceId: string
): Promise<MediaAsset[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .order("media_role", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load resource media");

  return (data ?? []).map(mapMediaAsset);
}

function mapMediaAsset(row: {
  id: string; tenant_id: string; location_id: string | null; resource_id: string | null;
  media_role: string; storage_bucket: string; storage_path: string; original_filename: string | null;
  mime_type: string; size_bytes: number; width: number | null; height: number | null;
  alt_text: string | null; caption: string | null; is_primary: boolean; sort_order: number; created_at: string;
}): MediaAsset {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    resourceId: row.resource_id,
    mediaRole: row.media_role as MediaRole,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    altText: row.alt_text,
    caption: row.caption,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}
