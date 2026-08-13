import { describe, it, expect } from "vitest";
import { validateSegmentRules, formatRuleSummary } from "../utils/validate-segment-rules";
import type { SegmentRuleGroup } from "../types/segment";

describe("validateSegmentRules", () => {
  it("accepts valid numeric rule", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "completed_appointments", operator: "greater_than_or_equal", value: 5 }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts valid boolean rule", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "has_upcoming_appointment", operator: "is_true", value: true }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts valid monetary rule with currency", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "lifetime_paid", operator: "greater_than_or_equal", value: 20000, currency: "RSD" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects monetary rule without currency", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "lifetime_paid", operator: "greater_than_or_equal", value: 20000 }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid field", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "arbitrary_sql_injection", operator: "equals", value: 1 }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid operator for field type", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "has_upcoming_appointment", operator: "greater_than", value: 5 }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-numeric value for numeric field", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [{ field: "completed_appointments", operator: "equals", value: "five" }],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects too many rules", () => {
    const rules = Array.from({ length: 25 }, (_, i) => ({
      field: "completed_appointments",
      operator: "greater_than",
      value: i,
    }));
    const result = validateSegmentRules({ operator: "and", rules });
    expect(result.valid).toBe(false);
  });

  it("accepts nested groups within depth limit", () => {
    const result = validateSegmentRules({
      operator: "and",
      rules: [
        { field: "completed_appointments", operator: "greater_than_or_equal", value: 5 },
        {
          operator: "or",
          rules: [
            { field: "days_since_last_appointment", operator: "greater_than_or_equal", value: 60 },
            { field: "has_upcoming_appointment", operator: "is_false", value: true },
          ],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects null input", () => {
    const result = validateSegmentRules(null);
    expect(result.valid).toBe(false);
  });
});

describe("formatRuleSummary", () => {
  it("formats empty rules as 'All customers'", () => {
    expect(formatRuleSummary({ operator: "and", rules: [] })).toBe("All customers");
  });

  it("formats single rule", () => {
    const group: SegmentRuleGroup = {
      operator: "and",
      rules: [{ field: "completed_appointments", operator: "greater_than_or_equal", value: 5 }],
    };
    expect(formatRuleSummary(group)).toContain("completed appointments");
    expect(formatRuleSummary(group)).toContain("5");
  });

  it("formats monetary rule with currency", () => {
    const group: SegmentRuleGroup = {
      operator: "and",
      rules: [{ field: "lifetime_paid", operator: "greater_than_or_equal", value: 20000, currency: "RSD" }],
    };
    const summary = formatRuleSummary(group);
    expect(summary).toContain("RSD");
    expect(summary).toContain("20000");
  });
});
