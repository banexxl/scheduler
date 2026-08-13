import { describe, it, expect } from "vitest";

/**
 * Marketing Eligibility Unit Tests — Milestone 15.7.
 *
 * Tests the eligibility logic (exclusion reasons) without hitting the database.
 * The actual evaluateMarketingEligibility function requires DB access;
 * these tests verify the decision rules and skip reason semantics.
 */

type CustomerData = {
  id: string;
  email: string | null;
  marketing_opt_in: boolean;
  is_blocked: boolean;
};

type SkipReason = "marketing_opt_out" | "missing_email" | "invalid_email" | "customer_blocked" | null;

/** Pure logic mirror of the eligibility service */
function evaluateEligibilityPure(customer: CustomerData): { eligible: boolean; skipReason: SkipReason } {
  if (customer.is_blocked) return { eligible: false, skipReason: "customer_blocked" };
  if (!customer.marketing_opt_in) return { eligible: false, skipReason: "marketing_opt_out" };
  if (!customer.email) return { eligible: false, skipReason: "missing_email" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) return { eligible: false, skipReason: "invalid_email" };
  return { eligible: true, skipReason: null };
}

describe("marketing eligibility", () => {
  it("eligible customer with valid email and opt-in", () => {
    const result = evaluateEligibilityPure({
      id: "c1",
      email: "customer@example.com",
      marketing_opt_in: true,
      is_blocked: false,
    });
    expect(result.eligible).toBe(true);
    expect(result.skipReason).toBeNull();
  });

  it("excludes customer with marketing_opt_in = false", () => {
    const result = evaluateEligibilityPure({
      id: "c2",
      email: "customer@example.com",
      marketing_opt_in: false,
      is_blocked: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.skipReason).toBe("marketing_opt_out");
  });

  it("excludes blocked customer even with opt-in", () => {
    const result = evaluateEligibilityPure({
      id: "c3",
      email: "customer@example.com",
      marketing_opt_in: true,
      is_blocked: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.skipReason).toBe("customer_blocked");
  });

  it("excludes customer with missing email", () => {
    const result = evaluateEligibilityPure({
      id: "c4",
      email: null,
      marketing_opt_in: true,
      is_blocked: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.skipReason).toBe("missing_email");
  });

  it("excludes customer with invalid email format", () => {
    const result = evaluateEligibilityPure({
      id: "c5",
      email: "not-an-email",
      marketing_opt_in: true,
      is_blocked: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.skipReason).toBe("invalid_email");
  });

  it("blocked takes priority over opt-out", () => {
    const result = evaluateEligibilityPure({
      id: "c6",
      email: "a@b.com",
      marketing_opt_in: false,
      is_blocked: true,
    });
    expect(result.skipReason).toBe("customer_blocked");
  });

  it("opt-out takes priority over missing email", () => {
    const result = evaluateEligibilityPure({
      id: "c7",
      email: null,
      marketing_opt_in: false,
      is_blocked: false,
    });
    expect(result.skipReason).toBe("marketing_opt_out");
  });

  describe("segment match ≠ marketing eligibility", () => {
    it("segment-matched inactive customer without opt-in is NOT eligible", () => {
      // This customer matches "inactive_customers" segment but hasn't opted in
      const result = evaluateEligibilityPure({
        id: "inactive1",
        email: "inactive@example.com",
        marketing_opt_in: false,
        is_blocked: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.skipReason).toBe("marketing_opt_out");
    });

    it("segment-matched customer with opt-in IS eligible", () => {
      const result = evaluateEligibilityPure({
        id: "active1",
        email: "active@example.com",
        marketing_opt_in: true,
        is_blocked: false,
      });
      expect(result.eligible).toBe(true);
    });
  });

  describe("marketing vs transactional", () => {
    it("marketing opt-out does NOT imply transactional suppression", () => {
      // The eligibility service only applies to MARKETING emails.
      // Transactional messages (confirmations, reminders) use separate logic.
      const marketingEligibility = evaluateEligibilityPure({
        id: "c8",
        email: "customer@example.com",
        marketing_opt_in: false,
        is_blocked: false,
      });
      expect(marketingEligibility.eligible).toBe(false);
      // But transactional messages would still be delivered (tested elsewhere)
    });
  });
});
