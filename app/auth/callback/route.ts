import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/get-safe-redirect-path";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";
import type { NextRequest } from "next/server";

/**
 * Authentication callback route handler.
 * Supports authorization code exchange (recovery links, future OAuth).
 *
 * - Validates the "next" parameter (only internal paths allowed)
 * - Rejects external/protocol-relative URLs
 * - Redirects to /auth-error on failure
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    redirect("/auth-error?code=callback_failed");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect("/auth-error?code=callback_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth-error?code=callback_failed");
  }

  // Redirect to validated next or resolve destination
  if (next) {
    redirect(getSafeRedirectPath(next));
  }

  const destination = await resolveLoginDestination(user);
  redirect(destination);
}
