import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

/**
 * Load a tenant by normalized slug.
 * Does not grant access merely because a tenant exists.
 */
export async function getTenantBySlug(
  slug: string
): Promise<TenantRow | null> {
  const normalizedSlug = slug.toLowerCase().trim();

  if (!normalizedSlug) return null;

  try {
    const serviceRoleClient = createServiceRoleClient();
    const { data, error } = await serviceRoleClient
      .from("tenants")
      .select("id, name, slug, status")
      .eq("slug", normalizedSlug)
      .single();
    if (!error && data) {
      return data;
    }
  } catch {
    // Fall through to null if the service role client is unavailable.
  }

  return null;
}
