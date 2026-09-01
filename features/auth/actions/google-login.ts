"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/helpers/get-app-url";

/**
 * Google OAuth Login Action.
 *
 * Initiates Google OAuth flow via Supabase.
 * After Google auth completes, Supabase redirects to /api/auth/callback
 * which exchanges the code and resolves the user's home page
 * (admin/tenant/customer) via resolveLoginDestination.
 *
 * Prerequisites:
 * - Google OAuth provider enabled in Supabase Dashboard → Authentication → Providers
 * - Google Cloud Console OAuth credentials configured
 * - Redirect URL added to Supabase: {APP_URL}/api/auth/callback
 */
export async function googleLoginAction(): Promise<never> {
  const supabase = await createClient();
  const callbackUrl = new URL("/api/auth/callback", getAppUrl()).toString();

  console.log("[google-login] Initiating OAuth", { provider: "google", callbackUrl });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    console.error("[google-login] OAuth initiation failed:", { callbackUrl, message: error?.message, status: error?.status });
    redirect("/auth-error?code=oauth_failed");
  }

  console.log("[google-login] OAuth initiated, redirecting to provider", { hasUrl: Boolean(data.url) });
  redirect(data.url);
}
