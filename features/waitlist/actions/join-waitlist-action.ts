"use server";

/**
 * Public Join Waitlist Action — Milestone 8.8.
 */

import { headers } from "next/headers";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { joinWaitlist } from "../services/waitlist-join-service";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import type { RateLimitConfig } from "@/lib/rate-limit/rate-limiter";
import type { JoinWaitlistInput } from "../types/waitlist";

const WAITLIST_JOIN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 10 * 60 * 1000,
};

type ActionResult =
  | { success: true; isExisting: boolean }
  | { success: false; error: string };

export async function joinWaitlistAction(
  tenantSlug: string,
  input: JoinWaitlistInput
): Promise<ActionResult> {
  try {
    const h = await headers();
    const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateResult = checkRateLimit(`waitlist:${tenantSlug}:${clientIp}`, WAITLIST_JOIN_RATE_LIMIT);
    if (!rateResult.allowed) {
      return { success: false, error: "Too many requests. Please try again shortly." };
    }

    const context = await resolvePublicBookingContext(tenantSlug);
    if (!context) {
      return { success: false, error: "Booking is not available." };
    }

    const result = await joinWaitlist(context.tenant.id, input);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, isExisting: result.isExisting };
  } catch {
    return { success: false, error: "Unable to join waitlist." };
  }
}
