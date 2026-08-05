import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/get-safe-redirect-path";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Email confirmation route handler.
 * Handles Supabase email-confirmation with token_hash and type parameters.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!tokenHash || !type) {
    redirect("/auth-error?code=invalid_link");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    redirect("/auth-error?code=confirmation_failed");
  }

  // Resolve destination
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth-error?code=confirmation_failed");
  }

  // Use validated next param if provided, otherwise resolve normally
  if (next) {
    redirect(getSafeRedirectPath(next));
  }

  const destination = await resolveLoginDestination(user);
  redirect(destination);
}
