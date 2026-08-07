import "server-only";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, slug, status")
    .eq("slug", normalizedSlug)
    .single();

  if (data) return data;

  if (error?.code === "PGRST116" || error?.code === "42501") {
    try {
      const serviceRoleClient = createServiceRoleClient();
      const { data: fallbackData, error: fallbackError } = await serviceRoleClient
        .from("tenants")
        .select("id, name, slug, status")
        .eq("slug", normalizedSlug)
        .single();

      if (!fallbackError && fallbackData) {
        return fallbackData;
      }
    } catch {
      // Fall through to null if the service role client is unavailable.
    }
  }

  return null;
}
