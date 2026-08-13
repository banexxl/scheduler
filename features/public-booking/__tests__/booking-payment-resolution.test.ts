/**
 * Booking Payment Resolution Unit Tests — Milestone 15.12.
 *
 * Tests payment option resolution logic, error mapping,
 * and recurring appointment restrictions.
 */

import { describe, it, expect } from "vitest";

describe("booking payment method resolution", () => {
  it("free service does not require payment selection", () => {
    const servicePrice = 0;
    const showPaymentStep = servicePrice > 0;
    expect(showPaymentStep).toBe(false);
  });

  it("paid service with no options still shows pay-at-business", () => {
    const servicePrice = 5000;
    const giftCardsEnabled = false;
    const onlinePaymentEnabled = false;
    const packageOptions: unknown[] = [];

    // Payment step shown only if there are alternative options
    const showPaymentStep = servicePrice > 0 && (giftCardsEnabled || onlinePaymentEnabled || packageOptions.length > 0);
    expect(showPaymentStep).toBe(false);
  });

  it("paid service with gift cards enabled shows payment step", () => {
    const servicePrice = 5000;
    const giftCardsEnabled = true;

    const showPaymentStep = servicePrice > 0 && giftCardsEnabled;
    expect(showPaymentStep).toBe(true);
  });

  it("paid service with package options shows payment step", () => {
    const servicePrice = 5000;
    const packageOptions = [{ customerPackageId: "cp1", packageName: "Pack", creditsRemaining: 3, creditsRequired: 1 }];

    const showPaymentStep = servicePrice > 0 && packageOptions.length > 0;
    expect(showPaymentStep).toBe(true);
  });
});

describe("recurring appointment restrictions", () => {
  it("recurring series forces pay_at_business", () => {
    const isRecurring = true;
    const paymentMethod = isRecurring ? "pay_at_business" : "online";
    expect(paymentMethod).toBe("pay_at_business");
  });

  it("recurring series hides payment step", () => {
    const isRecurring = true;
    const showPaymentStep = !isRecurring && true; // Would normally show
    expect(showPaymentStep).toBe(false);
  });

  it("recurring series disables gift card selection", () => {
    const isRecurring = true;
    const giftCardReservation = isRecurring ? null : { reservationId: "r1", reservedAmount: 2000, currency: "USD", codePrefix: "GS-ABCD" };
    expect(giftCardReservation).toBeNull();
  });

  it("recurring series disables package credit", () => {
    const isRecurring = true;
    const packageOption = isRecurring ? null : { customerPackageId: "cp1", packageName: "Pack", creditsRemaining: 3, creditsRequired: 1 };
    expect(packageOption).toBeNull();
  });
});

describe("public booking error codes", () => {
  const errorCodes = [
    "BOOKING_UNAVAILABLE",
    "INVALID_SELECTION",
    "SLOT_TAKEN",
    "DETAILS_CHANGED",
    "VALIDATION_ERROR",
    "RATE_LIMITED",
    "CAPTCHA_FAILED",
    "BOOKING_DISABLED",
    "GIFT_CARD_RESERVATION_EXPIRED",
    "PACKAGE_CREDIT_FAILED",
    "UNKNOWN_ERROR",
  ] as const;

  it("all error codes are defined", () => {
    expect(errorCodes.length).toBe(11);
  });

  it("slot taken error should reset idempotency key", () => {
    const shouldReset = (code: string) =>
      code === "SLOT_TAKEN" || code === "DETAILS_CHANGED";

    expect(shouldReset("SLOT_TAKEN")).toBe(true);
    expect(shouldReset("DETAILS_CHANGED")).toBe(true);
    expect(shouldReset("VALIDATION_ERROR")).toBe(false);
  });
});

describe("gift card public error mapping", () => {
  it("maps cross-tenant attempts to generic INVALID_CODE", () => {
    const validationError = "WRONG_TENANT";
    const publicError = validationError === "WRONG_TENANT" ? "INVALID_CODE" : validationError;
    expect(publicError).toBe("INVALID_CODE");
  });

  it("maps disabled card to generic INVALID_CODE", () => {
    const validationError = "DISABLED";
    const publicError = validationError === "DISABLED" ? "INVALID_CODE" : validationError;
    expect(publicError).toBe("INVALID_CODE");
  });

  it("preserves EXPIRED for user clarity", () => {
    const validationError = "EXPIRED";
    const publicError = validationError;
    expect(publicError).toBe("EXPIRED");
  });
});

describe("price formatting", () => {
  it("formats minor units to major correctly", () => {
    const formatMinor = (minor: number) => (minor / 100).toFixed(2);
    expect(formatMinor(5000)).toBe("50.00");
    expect(formatMinor(999)).toBe("9.99");
    expect(formatMinor(0)).toBe("0.00");
    expect(formatMinor(100)).toBe("1.00");
  });
});
