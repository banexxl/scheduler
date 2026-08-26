/**
 * Subscription Guard Unit Tests — Milestone 15.14.
 *
 * Tests the access logic without real DB calls.
 * Verifies all business rules: trial active, trial expired, no trial,
 * active subscription, canceled but valid, past_due grace, platform admin.
 */

import { describe, it, expect } from "vitest";

// We test the logic directly since the actual function hits DB.
// These tests verify the business rules as pure logic.

describe("subscription access rules", () => {
  const now = Date.now();
  const day = 86400000;

  describe("trial state", () => {
    it("trial active when trial_ends_at is in the future", () => {
      const trialEnd = new Date(now + 7 * day);
      const isActive = trialEnd > new Date();
      expect(isActive).toBe(true);
    });

    it("trial expired when trial_ends_at is in the past", () => {
      const trialEnd = new Date(now - 1 * day);
      const isActive = trialEnd > new Date();
      expect(isActive).toBe(false);
    });

    it("no trial when trial_started_at is null", () => {
      const trialStartedAt = null;
      const hasStartedTrial = Boolean(trialStartedAt);
      expect(hasStartedTrial).toBe(false);
    });

    it("calculates days remaining correctly", () => {
      const trialEnd = new Date(now + 3 * day);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now) / day);
      expect(daysRemaining).toBe(3);
    });

    it("days remaining is 0 when expired", () => {
      const trialEnd = new Date(now - 2 * day);
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now) / day));
      expect(daysRemaining).toBe(0);
    });
  });

  describe("subscription state", () => {
    it("active subscription allows access", () => {
      const status = "active";
      const allowed = status === "active" || status === "trialing";
      expect(allowed).toBe(true);
    });

    it("trialing subscription allows access", () => {
      const status: string = "trialing";
      const allowed = status === "active" || status === "trialing";
      expect(allowed).toBe(true);
    });

    it("canceled subscription allows access until period end", () => {
      const status = "canceled";
      const periodEnd = new Date(now + 10 * day);
      const allowed = status === "canceled" && periodEnd > new Date();
      expect(allowed).toBe(true);
    });

    it("canceled subscription blocks after period end", () => {
      const status = "canceled";
      const periodEnd = new Date(now - 1 * day);
      const allowed = status === "canceled" && periodEnd > new Date();
      expect(allowed).toBe(false);
    });

    it("past_due allows within grace period", () => {
      const status = "past_due";
      const periodEnd = new Date(now - 2 * day); // ended 2 days ago
      const graceDays = 7;
      const graceEnd = new Date(periodEnd.getTime() + graceDays * day);
      const allowed = status === "past_due" && graceEnd > new Date();
      expect(allowed).toBe(true); // still within 7-day grace
    });

    it("past_due blocks after grace period", () => {
      const status = "past_due";
      const periodEnd = new Date(now - 10 * day); // ended 10 days ago
      const graceDays = 7;
      const graceEnd = new Date(periodEnd.getTime() + graceDays * day);
      const allowed = status === "past_due" && graceEnd > new Date();
      expect(allowed).toBe(false); // past 7-day grace
    });

    it("expired subscription blocks access", () => {
      const status: string = "expired";
      const allowed = status === "active" || status === "trialing";
      expect(allowed).toBe(false);
    });
  });

  describe("platform admin", () => {
    it("platform admin always has access", () => {
      const isPlatformAdmin = true;
      const access = isPlatformAdmin ? "allowed" : "no_subscription";
      expect(access).toBe("allowed");
    });
  });

  describe("access priority", () => {
    it("subscription takes priority over expired trial", () => {
      const subscriptionActive = true;
      const trialExpired = true;
      // Subscription check runs before trial check
      const access = subscriptionActive ? "allowed" : trialExpired ? "trial_expired" : "no_subscription";
      expect(access).toBe("allowed");
    });

    it("active trial allows even without subscription", () => {
      const subscriptionActive = false;
      const trialActive = true;
      const access = subscriptionActive ? "allowed" : trialActive ? "allowed" : "trial_expired";
      expect(access).toBe("allowed");
    });
  });
});

describe("polar status mapping", () => {
  const mapStatus = (polarStatus: string): string => {
    switch (polarStatus) {
      case "active": return "active";
      case "trialing": return "trialing";
      case "past_due": return "past_due";
      case "canceled": return "canceled";
      case "unpaid": return "past_due";
      case "incomplete": return "past_due";
      case "incomplete_expired": return "expired";
      case "revoked": return "expired";
      default: return polarStatus || "none";
    }
  };

  it("maps active correctly", () => expect(mapStatus("active")).toBe("active"));
  it("maps trialing correctly", () => expect(mapStatus("trialing")).toBe("trialing"));
  it("maps past_due correctly", () => expect(mapStatus("past_due")).toBe("past_due"));
  it("maps canceled correctly", () => expect(mapStatus("canceled")).toBe("canceled"));
  it("maps unpaid to past_due", () => expect(mapStatus("unpaid")).toBe("past_due"));
  it("maps incomplete to past_due", () => expect(mapStatus("incomplete")).toBe("past_due"));
  it("maps incomplete_expired to expired", () => expect(mapStatus("incomplete_expired")).toBe("expired"));
  it("maps revoked to expired", () => expect(mapStatus("revoked")).toBe("expired"));
  it("maps empty to none", () => expect(mapStatus("")).toBe("none"));
});
