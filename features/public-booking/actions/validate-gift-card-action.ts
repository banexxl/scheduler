"use server";

/**
 * Public Gift Card Validation Action — Milestone 15.12.
 *
 * Validates a gift card code and creates a reservation for checkout.
 * Called from the public booking payment step.
 *
 * Security:
 * - Raw code is passed to server only for hashing — never stored/logged
 * - Tenant-scoped validation (cross-tenant returns generic error)
 * - Server-authoritative balance
 * - Reservation expires in 15 minutes
 */

import { resolvePublicBookingContext } from "../services/public-tenant-resolver";
import { validateGiftCardForRedemption, reserveGiftCardValue } from "@/features/gift-cards/services/gift-card-redemption-service";
import { isFeatureEnabled } from "@/features/platform/services/feature-override-service";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";

// ─── Result Types ────────────────────────────────────────────────────────────

export type ValidateGiftCardResult =
  | {
      success: true;
      reservationId: string;
      reservedAmount: number;
      availableBalance: number;
      currency: string;
      codePrefix: string;
    }
  | {
      success: false;
      error: string;
      code: GiftCardPublicError;
    };

export type GiftCardPublicError =
  | "INVALID_CODE"
  | "EXPIRED"
  | "NO_BALANCE"
  | "NOT_AVAILABLE"
  | "CURRENCY_MISMATCH"
  | "FEATURE_DISABLED";

// ─── Main Action ─────────────────────────────────────────────────────────────

/**
 * Validates a gift card code and reserves value for checkout.
 *
 * @param tenantSlug - The public tenant slug
 * @param rawCode - The raw gift card code entered by customer (NEVER stored/logged)
 * @param servicePrice - The service price in minor units
 * @param serviceCurrency - The service currency (ISO 4217)
 */
export async function validateGiftCardAction(
  tenantSlug: string,
  rawCode: string,
  servicePrice: number,
  serviceCurrency: string
): Promise<ValidateGiftCardResult> {
  // Resolve tenant
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) {
    return { success: false, error: "Booking is not available.", code: "NOT_AVAILABLE" };
  }

  const { tenant } = context;
  const tenantId = tenant.id;

  const log = createServerActionLogger({
    action: "public_booking.gift_card_validate",
    tenantId,
  });

  try {
    // Check platform feature override
    const giftCardsEnabled = await isFeatureEnabled(tenantId, "gift_cards");
    if (!giftCardsEnabled) {
      return { success: false, error: "Gift cards are not available at this time.", code: "FEATURE_DISABLED" };
    }

    // Validate code (hashing happens inside — raw code never stored)
    const validation = await validateGiftCardForRedemption(tenantId, rawCode, serviceCurrency);

    if (!validation.valid) {
      const errorMap: Record<string, { message: string; code: GiftCardPublicError }> = {
        INVALID_CODE: { message: "Invalid gift card code.", code: "INVALID_CODE" },
        EXPIRED: { message: "This gift card has expired.", code: "EXPIRED" },
        DISABLED: { message: "This gift card is no longer active.", code: "INVALID_CODE" },
        FULLY_REDEEMED: { message: "This gift card has no remaining balance.", code: "NO_BALANCE" },
        WRONG_TENANT: { message: "Invalid gift card code.", code: "INVALID_CODE" },
        CURRENCY_MISMATCH: { message: "This gift card cannot be used for this service.", code: "CURRENCY_MISMATCH" },
        REDEMPTION_NOT_ALLOWED: { message: "Gift card redemption is not available.", code: "NOT_AVAILABLE" },
      };

      const mapped = errorMap[validation.reason] ?? { message: "Invalid gift card code.", code: "INVALID_CODE" as const };
      return { success: false, error: mapped.message, code: mapped.code };
    }

    // Reserve value
    const reservation = await reserveGiftCardValue(
      tenantId,
      validation.giftCardId,
      servicePrice,
      serviceCurrency
    );

    if (!reservation.success) {
      return { success: false, error: reservation.error, code: "NO_BALANCE" };
    }

    await log.success({ reservationId: reservation.reservationId });

    return {
      success: true,
      reservationId: reservation.reservationId,
      reservedAmount: reservation.reservedAmount,
      availableBalance: validation.currentBalance,
      currency: reservation.currency,
      codePrefix: validation.codePrefix,
    };
  } catch (error) {
    await log.failure(error instanceof Error ? error : new Error("Gift card validation failed"));
    return { success: false, error: "Unable to validate gift card. Please try again.", code: "NOT_AVAILABLE" };
  }
}

// ─── Release Action ──────────────────────────────────────────────────────────

/**
 * Releases a gift card reservation (called when customer removes gift card or abandons).
 */
export async function releaseGiftCardReservationAction(
  tenantSlug: string,
  reservationId: string
): Promise<{ success: boolean }> {
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) {
    return { success: false };
  }

  try {
    const { releaseGiftCardReservation } = await import("@/features/gift-cards/services/gift-card-redemption-service");
    await releaseGiftCardReservation(context.tenant.id, reservationId);
    return { success: true };
  } catch {
    return { success: false };
  }
}
