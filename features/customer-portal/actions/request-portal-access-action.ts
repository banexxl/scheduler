"use server";

/**
 * Request Customer Portal Access — Milestone 8.6.
 *
 * Public action (no authentication required).
 * Accepts an email, rate-limits, and if matching appointments exist,
 * creates a magic-link token and enqueues the portal access email.
 *
 * CRITICAL: Always returns the same public response regardless of whether
 * the email matches any customer data. This prevents email enumeration.
 */

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import {
  createPortalAccessToken,
  normalizeEmail,
} from "../services/portal-token-service";
import { enqueuePortalAccessEmail } from "../services/portal-email-service";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import type { RateLimitConfig } from "@/lib/rate-limit/rate-limiter";

// ─── Rate Limit Config ───────────────────────────────────────────────────────

const PORTAL_ACCESS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// ─── Public Response (always the same) ───────────────────────────────────────

const PUBLIC_RESPONSE_MESSAGE =
  "If we found appointments for that email, a secure access link is on its way. Please check your inbox.";

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

    const { tenant } = context;
    const normalized = normalizeEmail(email);

    // 4. Check if email has appointments with this tenant
    const supabase = createAdminClient();
    const { data: appointments } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("appointments")
      .select("id, customer_id" as never)
      .eq("tenant_id" as never, tenant.id)
      .eq("customer_email" as never, normalized)
      .limit(1);

    const hasAppointments = appointments && (appointments as unknown as unknown[]).length > 0;

    if (!hasAppointments) {
      // Return same message — no enumeration
      return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
    }

    // 5. Resolve customer_id if available
    const firstAppt = (appointments as unknown as Array<{ id: string; customer_id: string | null }>)[0];
    const customerId = firstAppt?.customer_id ?? null;

    // 6. Create access token
    const tokenResult = await createPortalAccessToken(tenant.id, normalized, customerId);

    // 7. Build portal access URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portalAccessUrl = `${appUrl}/book/${tenantSlug}/portal/session/${tokenResult.rawToken}`;

    // 8. Enqueue portal access email
    await enqueuePortalAccessEmail({
      tenantId: tenant.id,
      tenantName: tenant.name,
      recipientEmail: normalized,
      customerName: null, // We don't expose name in the access email
      portalAccessUrl,
      expiresInMinutes: 15,
    });

    // 9. Same public response
    return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
  } catch (error) {
    console.error("[request-portal-access] Error:", {
      tenantSlug,
      error: error instanceof Error ? error.message : "unknown",
    });
    // Return generic message even on errors
    return { success: true, message: PUBLIC_RESPONSE_MESSAGE };
  }
}
