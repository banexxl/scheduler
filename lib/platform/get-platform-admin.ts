import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type PlatformAdminRow = {
  id: string;
  role: string;
  is_active: boolean;
  user_id: string;
};

/**
 * Returns the active platform_admins row for the given user, or null.
 * Does not use email matching or metadata.
 * Does not use the service-role client.
 */
export async function getPlatformAdmin(
  user: User
): Promise<PlatformAdminRow | null> {
  const supabase = await createClient();

  // NOTE: use ordering + limit(1) + maybeSingle() rather than .single().
  // .single() throws a PostgREST error when the result is not EXACTLY one row,
  // i.e. it fails both for zero rows AND for duplicate active admin rows for the
  // same user_id. Duplicates (or an OAuth-created auth user with more than one
  // matching admin row) would otherwise crash any page guarded by this helper.
  const { data } = await supabase
    .from("platform_admins")
    .select("id, role, is_active, user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}
