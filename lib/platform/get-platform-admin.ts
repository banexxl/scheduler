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

  const { data } = await supabase
    .from("platform_admins")
    .select("id, role, is_active, user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return data;
}
