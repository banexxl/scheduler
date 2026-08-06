import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the currently authenticated user or null.
 * Validates the session through the server Supabase client.
 * Does not trust client-provided user IDs.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    // Stale or missing refresh tokens can appear during build/SSR when the
    // browser has no valid auth session. Treat that as unauthenticated.
    return null;
  }
}
