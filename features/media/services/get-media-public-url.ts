import { clientEnvironment } from "@/lib/environment/client";

/**
 * Generates a public URL for a media asset stored in Supabase Storage.
 * Does not store full URLs in the database — generates them on demand.
 */
export function getMediaPublicUrl(
  storageBucket: string,
  storagePath: string
): string {
  const supabaseUrl = clientEnvironment.supabaseUrl;
  return `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${storagePath}`;
}
