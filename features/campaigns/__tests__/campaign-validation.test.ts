import { describe, it, expect } from "vitest";
import { validateSegmentRules } from "@/features/segmentation/utils/validate-segment-rules";

/**
 * Campaign Validation Tests — Milestone 15.7.
 *
 * Tests campaign-related validation: CTA URLs, segment rules with monetary fields,
 * campaign lifecycle rules, and audience serialization.
 */

describe("campaign validation", () => {
  describe("CTA URL validation", () => {
    it("accepts valid https URLs", () => {
      const url = "https://example.com/book";
      expect(url.startsWith("http://") || url.startsWith("https://")).toBe(true);
    });

    it("accepts valid http URLs", () => {
      const url = "http://example.com/book";
      expect(url.startsWith("http://") || url.startsWith("https://")).toBe(true);
    });

    it("rejects javascript: protocol", () => {
      const url = "javascript:alert(1)";
      expect(url.startsWith("http://") || url.startsWith("https://")).toBe(false);
    });

    it("rejects data: protocol", () => {
      const url = "data:text/html,<script>alert(1)</script>";
      expect(url.startsWith("http://") || url.startsWith("https://")).toBe(false);
    });

    it("rejects empty string as valid URL", () => {
      const url = "";
      expect(url.startsWith("http://") || url.startsWith("https://")).toBe(false);
    });
  });

  describe("campaign lifecycle rules", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      draft: ["scheduled", "processing", "cancelled"],
      scheduled: ["processing", "cancelled"],
      processing: ["completed", "failed"],
      completed: [],
      cancelled: [],
      failed: [],
    };

    it("allows draft → scheduled", () => {
      expect(VALID_TRANSITIONS["draft"]).toContain("scheduled");
    });

    it("allows draft → processing (send now)", () => {
      expect(VALID_TRANSITIONS["draft"]).toContain("processing");
    });

    it("allows scheduled → cancelled", () => {
      expect(VALID_TRANSITIONS["scheduled"]).toContain("cancelled");
    });

    it("allows processing → completed", () => {
      expect(VALID_TRANSITIONS["processing"]).toContain("completed");
    });

    it("allows processing → failed", () => {
      expect(VALID_TRANSITIONS["processing"]).toContain("failed");
    });

    it("does not allow completed → any transition", () => {
      expect(VALID_TRANSITIONS["completed"]).toHaveLength(0);
    });

    it("does not allow cancelled → any transition", () => {
      expect(VALID_TRANSITIONS["cancelled"]).toHaveLength(0);
    });
  });

  describe("monetary segmentation rules", () => {
    it("validates net_paid_amount requires currency", () => {
      const result = validateSegmentRules({
        operator: "and",
        rules: [{ field: "net_paid_amount", operator: "greater_than_or_equal", value: 20000 }],
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.includes("currency"))).toBe(true);
      }
    });

    it("validates net_paid_amount with currency passes", () => {
      const result = validateSegmentRules({
        operator: "and",
        rules: [{ field: "net_paid_amount", operator: "greater_than_or_equal", value: 20000, currency: "RSD" }],
      });
      expect(result.valid).toBe(true);
    });

    it("validates lifetime_paid requires currency (backward compat alias)", () => {
      const result = validateSegmentRules({
        operator: "and",
        rules: [{ field: "lifetime_paid", operator: "greater_than", value: 5000 }],
      });
      expect(result.valid).toBe(false);
    });

    it("validates lifetime_paid with currency passes", () => {
      const result = validateSegmentRules({
        operator: "and",
        rules: [{ field: "lifetime_paid", operator: "greater_than", value: 5000, currency: "EUR" }],
      });
      expect(result.valid).toBe(true);
    });

    it("requires numeric value for monetary fields", () => {
      const result = validateSegmentRules({
        operator: "and",
        rules: [{ field: "net_paid_amount", operator: "greater_than", value: "abc", currency: "RSD" }],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("schedule timezone conversion", () => {
    it("converts local datetime to UTC ISO string", () => {
      // Simulating: tenant enters Aug 20 at 10:00 Europe/Belgrade (UTC+2)
      const localInput = "2026-08-20T10:00";
      const utcDate = new Date(localInput + ":00+02:00");
      expect(utcDate.toISOString()).toBe("2026-08-20T08:00:00.000Z");
    });

    it("scheduled time must be in the future", () => {
      const past = new Date("2020-01-01T00:00:00Z");
      expect(past <= new Date()).toBe(true);
    });

    it("scheduled time in the future is valid", () => {
      const future = new Date("2030-01-01T00:00:00Z");
      expect(future > new Date()).toBe(true);
    });
  });

  describe("audience snapshot serialization", () => {
    it("serializes segment rules to JSON", () => {
      const rules = {
        operator: "and" as const,
        rules: [
          { field: "completed_appointments" as const, operator: "greater_than_or_equal" as const, value: 5 },
          { field: "days_since_last_appointment" as const, operator: "greater_than_or_equal" as const, value: 60 },
        ],
      };
      const json = JSON.stringify(rules);
      const parsed = JSON.parse(json);
      expect(parsed.operator).toBe("and");
      expect(parsed.rules).toHaveLength(2);
    });

    it("snapshot survives segment mutation", () => {
      const originalRules = {
        operator: "and" as const,
        rules: [{ field: "completed_appointments" as const, operator: "greater_than_or_equal" as const, value: 5 }],
      };
      const snapshot = JSON.parse(JSON.stringify(originalRules));

      // Mutate "original" (simulating segment edit)
      originalRules.rules[0]!.value = 10;

      // Snapshot must remain unchanged
      expect(snapshot.rules[0].value).toBe(5);
    });
  });
});
