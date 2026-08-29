"use server";

/**
 * Request Customer Portal Access — Supabase Auth Magic Link.
 *
 * Public action (no authentication required).
 * Uses Supabase Auth signInWithOtp to send a magic link.
 *
 * CRITICAL: Always returns the same public response regardless of whether
 * the email matches any customer data. This prevents email enumeration.
 */

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { normalizeEmail } from "../services/portal-token-service";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import type { RateLimitConfig } from "@/lib/rate-limit/rate-limiter";

// ─── Rate Limit Config ───────────────────────────────────────────────────────

const PORTAL_ACCESS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// ─── Public Response (always the same) ───────────────────────────────────────

const PUBLIC_RESPONSE_MESSAGE =
  "If we found appointments for that email, a sign-in link is on its way. Please check your inbox.";

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string; code?: string };

// ─── Action ──────────────────────────────────────────────────────────────────

export async function requestPortalAccessAction(
  tenantSlug: string,
  input: { email: string }
): Promise<ActionResult> {
  try {
    // 1. Basic validation
    const email = input.email?.trim();
    if (!email || email.length < 3 || !email.includes("@")) {
      return { success: false, error: "Please enter a valid email address.", code: "VALIDATION" };
    }

    // 2. Rate limit by IP + tenant
    const h = await headers();
    const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateLimitKey = `portal:${tenantSlug}:${clientIp}`;

    const rateResult = checkRateLimit(rateLimitKey, PORTAL_ACCESS_RATE_LIMIT);
    if (!rateResult.allowed) {
      return {
        success: false,
        error: "Too many requests. Please try again shortly.",
        code: "RATE_LIMITED",
      };
    }

    // 3. Resolve tenant
    const context = await resolvePublicBookingContext(tenantSlug);
    if (!context) {
      // Return generic message even when tenant is invalid
      return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
    }

    const normalized = normalizeEmail(email);

    // 4. Check if email has appointments with this tenant
    const adminClient = createAdminClient();
    const { data: appointments } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("appointments")
      .select("id" as never)
      .eq("tenant_id" as never, context.tenant.id)
      .eq("customer_email" as never, normalized)
      .limit(1);

    const hasAppointments = appointments && (appointments as unknown as unknown[]).length > 0;

    if (!hasAppointments) {
      // Return same message — no enumeration
      return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
    }

    // 5. Send Supabase Auth magic link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectTo = `${appUrl}/api/auth/callback?next=/book/${tenantSlug}/portal`;

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[request-portal-access] signInWithOtp error:", error.message);
      // Still return generic message to prevent enumeration
    }

    // 6. Same public response
    return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
  } catch (error) {
    console.error("[request-portal-access] Error:", {
      tenantSlug,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
  }
}
