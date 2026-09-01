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

  console.log("[auth/callback] Received callback", {
    hasCode: Boolean(code),
    next: next ?? "(none)",
    origin: request.nextUrl.origin,
  });

  if (!code) {
    console.error("[auth/callback] No code parameter in callback URL");
    redirect("/auth-error?code=callback_failed");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", { message: error.message, status: error.status, code: error.code });
    redirect("/auth-error?code=callback_failed");
  }

  console.log("[auth/callback] Code exchange succeeded");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[auth/callback] getUser returned null after successful code exchange");
    redirect("/auth-error?code=callback_failed");
  }

  // Redirect to validated next or resolve destination
  if (next) {
    const safeNext = getSafeRedirectPath(next);
    console.log("[auth/callback] Redirecting to validated next", { userId: user.id, requestedNext: next, safeNext });
    redirect(safeNext);
  }

  const destination = await resolveLoginDestination(user);
  console.log("[auth/callback] Redirecting to resolved destination", { userId: user.id, destination });
  redirect(destination);
}
