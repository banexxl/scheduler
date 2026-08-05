import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getPlatformAdmin, type PlatformAdminRow } from "./get-platform-admin";
import type { User } from "@supabase/supabase-js";

export type PlatformAdminContext = {
  user: User;
  platformAdmin: PlatformAdminRow;
};

/**
 * Requires an authenticated user who is an active platform admin.
 * Returns both the verified user and platform-admin data.
 * Calls notFound() when the user is not a platform admin.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const user = await requireUser();
  const platformAdmin = await getPlatformAdmin(user);

  if (!platformAdmin) {
    notFound();
  }

  return { user, platformAdmin };
}
