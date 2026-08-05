import "server-only";
import { redirect } from "next/navigation";
import { getUser } from "./get-user";
import { getSafeRedirectPath } from "./get-safe-redirect-path";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the currently authenticated user.
 * Redirects to /login when no authenticated user exists.
 * Optionally includes a validated internal "next" destination.
 */
export async function requireUser(
  nextPath?: string | null
): Promise<User> {
  const user = await getUser();

  if (!user) {
    const next = nextPath
      ? `?next=${encodeURIComponent(getSafeRedirectPath(nextPath))}`
      : "";
    redirect(`/login${next}`);
  }

  return user;
}
