import { describe, it, expect } from "vitest";
import { resolveAppointmentPaymentStatus } from "../utils/resolve-appointment-payment-status";
import {
  toMinorUnits,
  fromMinorUnits,
  formatMinorUnits,
  getCurrencyExponent,
  isValidCurrencyCode,
} from "../utils/currency-minor-units";
import {
  APPOINTMENT_PAYMENT_STATUSES,
  PAYMENT_REQUIREMENTS,
  PAYMENT_PROVIDERS,
} from "../types/appointment-payment";
import { PAYMENT_INTENT_STATUSES } from "../types/payment-intent";

// ─── Status Resolution ───────────────────────────────────────────────────────

describe("resolveAppointmentPaymentStatus", () => {
  it("returns not_required when requirement is none", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "none",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: null,
    })).toBe("not_required");
  });

  it("returns unpaid when no payment and no intent", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: null,
    })).toBe("unpaid");
  });

  it("returns pending when creating intent exists", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: "creating",
    })).toBe("pending");
  });

  it("returns pending when open intent exists", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: "open",
    })).toBe("pending");
  });

  it("returns pending when processing intent exists", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: "processing",
    })).toBe("pending");
  });

  it("returns unpaid when intent is failed (not active)", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: "failed",
    })).toBe("unpaid");
  });

  it("returns unpaid when intent is expired", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 0,
      amountRefunded: 0,
      activeIntentStatus: "expired",
    })).toBe("unpaid");
  });

  it("returns paid when amount_paid >= amount_total", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 3000,
      amountRefunded: 0,
      activeIntentStatus: null,
    })).toBe("paid");
  });

  it("returns paid when overpaid", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 3500,
      amountRefunded: 0,
      activeIntentStatus: null,
    })).toBe("paid");
  });

  it("returns partially_paid when partial payment", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 1500,
      amountRefunded: 0,
      activeIntentStatus: null,
    })).toBe("partially_paid");
  });

  it("returns refunded when full refund", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 3000,
      amountRefunded: 3000,
      activeIntentStatus: null,
    })).toBe("refunded");
  });

  it("returns partially_refunded when partial refund", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "full",
      amountTotal: 3000,
      amountPaid: 3000,
      amountRefunded: 1000,
      activeIntentStatus: null,
    })).toBe("partially_refunded");
  });

  it("returns not_required regardless of amounts when requirement is none", () => {
    expect(resolveAppointmentPaymentStatus({
      paymentRequirement: "none",
      amountTotal: 3000,
      amountPaid: 3000,
      amountRefunded: 0,
      activeIntentStatus: "succeeded",
    })).toBe("not_required");
  });
});

// ─── Currency Minor Units ────────────────────────────────────────────────────

describe("currency minor units", () => {
  describe("getCurrencyExponent", () => {
    it("returns 2 for EUR", () => {
      expect(getCurrencyExponent("EUR")).toBe(2);
    });

    it("returns 2 for USD", () => {
      expect(getCurrencyExponent("USD")).toBe(2);
    });

    it("returns 0 for JPY", () => {
      expect(getCurrencyExponent("JPY")).toBe(0);
    });

    it("returns 3 for BHD", () => {
      expect(getCurrencyExponent("BHD")).toBe(3);
    });

    it("returns 2 for RSD (unlisted defaults to 2)", () => {
      expect(getCurrencyExponent("RSD")).toBe(2);
    });

    it("is case-insensitive", () => {
      expect(getCurrencyExponent("jpy")).toBe(0);
    });
  });

  describe("toMinorUnits", () => {
    it("converts EUR 30.00 → 3000", () => {
      expect(toMinorUnits(30, "EUR")).toBe(3000);
    });

    it("converts EUR 0.50 → 50", () => {
      expect(toMinorUnits(0.5, "EUR")).toBe(50);
    });

    it("converts JPY 1000 → 1000 (zero-decimal)", () => {
      expect(toMinorUnits(1000, "JPY")).toBe(1000);
    });

    it("converts BHD 1.500 → 1500 (three-decimal)", () => {
      expect(toMinorUnits(1.5, "BHD")).toBe(1500);
    });

    it("rounds correctly for floating point", () => {
      expect(toMinorUnits(19.99, "EUR")).toBe(1999);
    });
  });

  describe("fromMinorUnits", () => {
    it("converts 3000 EUR → 30", () => {
      expect(fromMinorUnits(3000, "EUR")).toBe(30);
    });

    it("converts 1000 JPY → 1000", () => {
      expect(fromMinorUnits(1000, "JPY")).toBe(1000);
    });

    it("converts 1500 BHD → 1.5", () => {
      expect(fromMinorUnits(1500, "BHD")).toBe(1.5);
    });
  });

  describe("formatMinorUnits", () => {
    it("formats EUR correctly", () => {
      expect(formatMinorUnits(3000, "EUR")).toBe("30.00 EUR");
    });

    it("formats JPY correctly (no decimals)", () => {
      expect(formatMinorUnits(1000, "JPY")).toBe("1000 JPY");
    });

    it("formats BHD correctly (3 decimals)", () => {
      expect(formatMinorUnits(1500, "BHD")).toBe("1.500 BHD");
    });

    it("formats zero", () => {
      expect(formatMinorUnits(0, "USD")).toBe("0.00 USD");
    });
  });

  describe("isValidCurrencyCode", () => {
    it("accepts valid codes", () => {
      expect(isValidCurrencyCode("EUR")).toBe(true);
      expect(isValidCurrencyCode("USD")).toBe(true);
      expect(isValidCurrencyCode("RSD")).toBe(true);
    });

    it("rejects lowercase", () => {
      expect(isValidCurrencyCode("eur")).toBe(false);
    });

    it("rejects wrong length", () => {
      expect(isValidCurrencyCode("EU")).toBe(false);
      expect(isValidCurrencyCode("EURO")).toBe(false);
    });

    it("rejects numbers", () => {
      expect(isValidCurrencyCode("E12")).toBe(false);
    });

    it("rejects empty", () => {
      expect(isValidCurrencyCode("")).toBe(false);
    });
  });
});

// ─── Constants ───────────────────────────────────────────────────────────────

describe("payment constants", () => {
  it("has 9 appointment payment statuses", () => {
    expect(APPOINTMENT_PAYMENT_STATUSES).toHaveLength(9);
    expect(APPOINTMENT_PAYMENT_STATUSES).toContain("not_required");
    expect(APPOINTMENT_PAYMENT_STATUSES).toContain("paid");
    expect(APPOINTMENT_PAYMENT_STATUSES).toContain("refunded");
  });

  it("has 3 payment requirements", () => {
    expect(PAYMENT_REQUIREMENTS).toHaveLength(3);
    expect(PAYMENT_REQUIREMENTS).toContain("none");
    expect(PAYMENT_REQUIREMENTS).toContain("full");
    expect(PAYMENT_REQUIREMENTS).toContain("deposit");
  });

  it("has 3 payment providers", () => {
    expect(PAYMENT_PROVIDERS).toHaveLength(3);
    expect(PAYMENT_PROVIDERS).toContain("polar");
    expect(PAYMENT_PROVIDERS).toContain("manual");
    expect(PAYMENT_PROVIDERS).toContain("external");
  });

  it("has 7 payment intent statuses", () => {
    expect(PAYMENT_INTENT_STATUSES).toHaveLength(7);
    expect(PAYMENT_INTENT_STATUSES).toContain("creating");
    expect(PAYMENT_INTENT_STATUSES).toContain("succeeded");
    expect(PAYMENT_INTENT_STATUSES).toContain("cancelled");
  });
});
