import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";

/**
 * Home Route Resolver — Milestone 15.13.
 *
 * Redirects the current user to their appropriate home page:
 * - Platform admin → /platform/dashboard
 * - Tenant owner/member → /{tenantSlug}/dashboard
 * - Customer → /account
 * - Unauthenticated → /login
 *
 * Uses the request origin for redirects (works correctly on both
 * preview deployments and production).
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const destination = await resolveLoginDestination(user);
    return NextResponse.redirect(new URL(destination, origin));
  } catch {
    return NextResponse.redirect(new URL("/login", origin));
  }
}
