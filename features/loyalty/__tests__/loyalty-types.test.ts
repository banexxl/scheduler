/**
 * Loyalty Types Tests — Milestone 8.10.
 */

import { describe, it, expect } from "vitest";
import {
  LOYALTY_TRANSACTION_TYPES,
  LOYALTY_REWARD_TYPES,
  DEFAULT_LOYALTY_SETTINGS,
} from "../types/loyalty";

describe("loyalty constants", () => {
  it("has 5 transaction types", () => {
    expect(LOYALTY_TRANSACTION_TYPES).toHaveLength(5);
    expect(LOYALTY_TRANSACTION_TYPES).toContain("earned");
    expect(LOYALTY_TRANSACTION_TYPES).toContain("manual_credit");
    expect(LOYALTY_TRANSACTION_TYPES).toContain("manual_debit");
    expect(LOYALTY_TRANSACTION_TYPES).toContain("reversal");
    expect(LOYALTY_TRANSACTION_TYPES).toContain("reward_redemption");
  });

  it("has 2 reward types", () => {
    expect(LOYALTY_REWARD_TYPES).toHaveLength(2);
    expect(LOYALTY_REWARD_TYPES).toContain("points_threshold");
    expect(LOYALTY_REWARD_TYPES).toContain("visit_threshold");
  });

  it("default settings are disabled", () => {
    expect(DEFAULT_LOYALTY_SETTINGS.isEnabled).toBe(false);
    expect(DEFAULT_LOYALTY_SETTINGS.pointsPerCompletedAppointment).toBe(0);
    expect(DEFAULT_LOYALTY_SETTINGS.countCompletedVisits).toBe(true);
  });
});
