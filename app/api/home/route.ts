import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";

/**
 * Home Route Resolver.
 *
 * Redirects the current user to their appropriate home page based on role:
 * - Platform admin → /platform/dashboard
 * - Tenant owner/member → /{tenantSlug}/dashboard
 * - Customer-only → /book/{tenantSlug}/portal
 * - New user (no role) → /create-business
 * - Unauthenticated → /login
 *
 * Uses resolveLoginDestination which queries platform_admins,
 * tenant_members, and tenant_customers to determine the user's role.
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
