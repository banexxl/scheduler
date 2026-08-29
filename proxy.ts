import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js Middleware (named proxy.ts per project convention).
 *
 * Responsibilities:
 * 1. Refresh Supabase auth session on every request (via updateSession)
 * 2. Route-aware — understands three route families:
 *    - /platform/*     → Platform admin routes
 *    - /{tenantSlug}/* → Tenant dashboard routes (except /book/*)
 *    - /book/*         → Public customer-facing booking routes
 * 3. Does NOT enforce authorization (that's done by page-level guards)
 *    Only refreshes the session so pages have valid auth state.
 *
 * Route families and their auth behavior:
 *
 * PUBLIC (no auth required, session refresh only):
 *   /book/*           — Public booking storefront, login, register
 *   /                 — Marketing homepage
 *   /login            — Business owner login
 *   /register         — Business owner registration
 *   /forgot-password  — Password reset
 *   /auth-error       — Auth error display
 *   /pricing          — Pricing page
 *   /features         — Features page
 *   /api/auth/*       — Auth callbacks
 *
 * AUTHENTICATED (session refresh, pages enforce their own guards):
 *   /platform/*       — Platform admin (requirePlatformAdmin)
 *   /{tenantSlug}/*   — Tenant dashboard (requireTenantMember)
 *   /customer/*       — Customer account (requireCustomerAccount)
 *   /create-business  — Business onboarding (requireUser)
 *   /api/home         — Home route resolver
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
    // Refresh Supabase session (reads/writes auth cookies)
    return updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - Static assets (svg, png, jpg, jpeg, gif, webp, ico)
         * - Supabase storage proxy paths
         */
        "/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
