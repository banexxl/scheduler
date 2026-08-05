import "server-only";
import { createClient } from "@/lib/supabase/server";

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

  const { data } = await supabase
    .from("tenants")
    .select("id, name, slug, status")
    .eq("slug", normalizedSlug)
    .single();

  return data;
}
