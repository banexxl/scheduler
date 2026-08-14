import { NextResponse } from "next/server";
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
 * Used by the error page "Go Home" button since error.tsx is a client component
 * and cannot directly call server-side identity resolution.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
    }

    const destination = await resolveLoginDestination(user);
    return NextResponse.redirect(new URL(destination, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  } catch {
    // Fallback if identity resolution fails
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
}
