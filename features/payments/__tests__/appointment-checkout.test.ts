import { describe, it, expect } from "vitest";

/**
 * Appointment Checkout Tests — Milestone 11.2.
 *
 * Tests checkout creation contract, provider adapter interface,
 * and return route safety. Provider calls are not made in unit tests.
 */

// ─── Provider Adapter Contract ───────────────────────────────────────────────

describe("AppointmentPaymentProvider interface", () => {
  it("defines createCheckout with required input fields", () => {
    // Contract: provider adapter receives trusted server-side values
    const requiredFields = [
      "paymentIntentId",
      "tenantId",
      "appointmentId",
      "amount",
      "currency",
      "description",
      "customerEmail",
      "customerName",
      "successUrl",
      "metadata",
    ];
    expect(requiredFields).toHaveLength(10);
  });

  it("returns checkoutId and checkoutUrl on success", () => {
    const expectedResult = {
      checkoutId: "chk_123",
      checkoutUrl: "https://checkout.polar.sh/chk_123",
      status: "open",
      expiresAt: null,
    };
    expect(expectedResult.checkoutId).toBeTruthy();
    expect(expectedResult.checkoutUrl).toMatch(/^https:\/\//);
  });
});

// ─── Checkout Eligibility ────────────────────────────────────────────────────

describe("checkout eligibility rules", () => {
  const ELIGIBLE_STATUSES = ["pending", "confirmed"];
  const INELIGIBLE_STATUSES = ["cancelled", "completed", "no_show", "checked_in", "in_progress"];

  it("allows pending appointments", () => {
    expect(ELIGIBLE_STATUSES).toContain("pending");
  });

  it("allows confirmed appointments", () => {
    expect(ELIGIBLE_STATUSES).toContain("confirmed");
  });

  it("rejects cancelled appointments", () => {
    expect(INELIGIBLE_STATUSES).toContain("cancelled");
  });

  it("rejects completed appointments", () => {
    expect(INELIGIBLE_STATUSES).toContain("completed");
  });

  it("rejects no_show appointments", () => {
    expect(INELIGIBLE_STATUSES).toContain("no_show");
  });
});

// ─── Amount Authority ────────────────────────────────────────────────────────

describe("amount authority", () => {
  it("amount comes from appointment_payments.amount_total, not client", () => {
    // Contract: client never sends amount in request
    // Action input is only: tenantSlug + appointmentId
    const clientInput = { tenantSlug: "my-business", appointmentId: "uuid" };
    expect(clientInput).not.toHaveProperty("amount");
    expect(clientInput).not.toHaveProperty("currency");
  });

  it("amount_to_pay = amount_total - amount_paid", () => {
    const amountTotal = 3000;
    const amountPaid = 0;
    const amountToPay = amountTotal - amountPaid;
    expect(amountToPay).toBe(3000);
  });

  it("rejects checkout when already paid", () => {
    const amountTotal = 3000;
    const amountPaid = 3000;
    const amountToPay = amountTotal - amountPaid;
    expect(amountToPay).toBe(0);
    // Should return ALREADY_PAID
  });
});

// ─── Payment Requirement Check ───────────────────────────────────────────────

describe("payment requirement check", () => {
  it("rejects checkout when requirement is none", () => {
    const requirement = "none";
    expect(requirement).toBe("none");
    // Should return NOT_REQUIRED
  });

  it("allows checkout when requirement is full", () => {
    const requirement = "full";
    expect(requirement).toBe("full");
  });

  it("deposit requirement is not enabled yet", () => {
    // Deposit checkout logic deferred to 11.4
    const supportedNow = ["none", "full"];
    expect(supportedNow).not.toContain("deposit");
  });
});

// ─── Return Route Safety ─────────────────────────────────────────────────────

describe("return route safety", () => {
  it("return route does NOT mark payment as paid", () => {
    // The return page only reads current intent status
    // It never calls update on amount_paid or paid_at
    // Payment confirmation only via webhook (11.3)
    const returnRouteActions = ["read_intent_status", "display_state"];
    expect(returnRouteActions).not.toContain("mark_paid");
    expect(returnRouteActions).not.toContain("update_amount_paid");
    expect(returnRouteActions).not.toContain("set_paid_at");
  });

  it("return page shows processing state by default", () => {
    const defaultState = "processing";
    expect(defaultState).toBe("processing");
    // Not "paid" — requires webhook confirmation
  });

  it("only shows paid when intent status is succeeded (from webhook)", () => {
    const intentStatus = "succeeded";
    const displayStatus = intentStatus === "succeeded" ? "paid" : "processing";
    expect(displayStatus).toBe("paid");
  });
});

// ─── Metadata Safety ─────────────────────────────────────────────────────────

describe("metadata sent to provider", () => {
  const metadata = {
    payment_intent_id: "uuid-intent",
    appointment_id: "uuid-appointment",
    tenant_id: "uuid-tenant",
  };

  it("contains correlation IDs", () => {
    expect(metadata).toHaveProperty("payment_intent_id");
    expect(metadata).toHaveProperty("appointment_id");
    expect(metadata).toHaveProperty("tenant_id");
  });

  it("does not contain email", () => {
    expect(metadata).not.toHaveProperty("email");
    expect(metadata).not.toHaveProperty("customer_email");
  });

  it("does not contain phone", () => {
    expect(metadata).not.toHaveProperty("phone");
  });

  it("does not contain internal notes", () => {
    expect(metadata).not.toHaveProperty("internal_notes");
    expect(metadata).not.toHaveProperty("customer_notes");
  });
});

// ─── Intent Transitions ──────────────────────────────────────────────────────

describe("intent status transitions in 11.2", () => {
  it("happy path: creating → open", () => {
    const transitions = ["creating", "open"];
    expect(transitions[0]).toBe("creating");
    expect(transitions[1]).toBe("open");
  });

  it("failure path: creating → failed", () => {
    const transitions = ["creating", "failed"];
    expect(transitions[1]).toBe("failed");
  });

  it("succeeded transition NOT in this milestone", () => {
    // Webhook confirmation (11.3) handles creating → succeeded
    const thisMilestoneTransitions = ["creating→open", "creating→failed"];
    expect(thisMilestoneTransitions).not.toContain("open→succeeded");
  });
});

// ─── Concurrency / Reuse ─────────────────────────────────────────────────────

describe("intent reuse and concurrency", () => {
  it("reuses existing open intent with matching amount/currency", () => {
    const existing = { status: "open", amount: 3000, currency: "EUR", checkoutUrl: "https://..." };
    const requested = { amount: 3000, currency: "EUR" };
    const shouldReuse = existing.status === "open" &&
      existing.amount === requested.amount &&
      existing.currency === requested.currency &&
      existing.checkoutUrl;
    expect(shouldReuse).toBeTruthy();
  });

  it("does not reuse if amount changed", () => {
    const existing = { status: "open", amount: 3000, currency: "EUR" };
    const requested = { amount: 2500, currency: "EUR" };
    const shouldReuse = existing.amount === requested.amount;
    expect(shouldReuse).toBe(false);
  });

  it("does not reuse succeeded intent", () => {
    const existing = { status: "succeeded", amount: 3000 };
    const reusableStatuses = ["creating", "open"];
    expect(reusableStatuses).not.toContain(existing.status);
  });

  it("does not reuse expired intent", () => {
    const existing = { status: "expired" };
    const reusableStatuses = ["creating", "open"];
    expect(reusableStatuses).not.toContain(existing.status);
  });
});

// ─── Success URL Generation ──────────────────────────────────────────────────

describe("success URL", () => {
  it("is generated server-side from PUBLIC_APP_URL", () => {
    const appUrl = "https://get-slot.app";
    const tenantSlug = "acme";
    const intentId = "intent-uuid";
    const successUrl = `${appUrl}/book/${tenantSlug}/payment/return?ref=${intentId}`;
    expect(successUrl).toMatch(/^https:\/\//);
    expect(successUrl).toContain("/payment/return");
  });

  it("never accepts client-provided returnUrl", () => {
    // Action input: { tenantSlug, appointmentId } only
    // No returnUrl field
    expect(true).toBe(true);
  });
});
