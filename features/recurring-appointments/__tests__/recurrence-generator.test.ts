import { describe, it, expect } from "vitest";
import { generateRecurringOccurrences, formatRecurrenceSummary } from "../services/generate-occurrences";
import type { RecurrenceRule } from "../types/recurrence";

describe("generateRecurringOccurrences", () => {
  describe("daily", () => {
    it("generates daily occurrences with interval 1", () => {
      const rule: RecurrenceRule = {
        type: "daily",
        interval: 1,
        startsOn: "2026-09-01",
        occurrenceCount: 5,
        startsAtLocalTime: "10:00",
        timezone: "Europe/Belgrade",
      };

      const result = generateRecurringOccurrences(rule, 30);
      expect(result).toHaveLength(5);
      expect(result[0]!.localDate).toBe("2026-09-01");
      expect(result[1]!.localDate).toBe("2026-09-02");
      expect(result[4]!.localDate).toBe("2026-09-05");
      expect(result[0]!.localTime).toBe("10:00");
    });

    it("generates daily occurrences with interval 2", () => {
      const rule: RecurrenceRule = {
        type: "daily",
        interval: 2,
        startsOn: "2026-09-01",
        occurrenceCount: 4,
        startsAtLocalTime: "14:30",
        timezone: "UTC",
      };

      const result = generateRecurringOccurrences(rule, 60);
      expect(result).toHaveLength(4);
      expect(result[0]!.localDate).toBe("2026-09-01");
      expect(result[1]!.localDate).toBe("2026-09-03");
      expect(result[2]!.localDate).toBe("2026-09-05");
      expect(result[3]!.localDate).toBe("2026-09-07");
    });

    it("respects end date", () => {
      const rule: RecurrenceRule = {
        type: "daily",
        interval: 1,
        startsOn: "2026-09-01",
        endsOn: "2026-09-03",
        startsAtLocalTime: "10:00",
        timezone: "UTC",
      };

      const result = generateRecurringOccurrences(rule, 30);
      expect(result).toHaveLength(3);
    });
  });

  describe("weekly", () => {
    it("generates weekly on selected days", () => {
      const rule: RecurrenceRule = {
        type: "weekly",
        interval: 1,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        startsOn: "2026-09-07", // Monday
        occurrenceCount: 6,
        startsAtLocalTime: "09:00",
        timezone: "Europe/Belgrade",
      };

      const result = generateRecurringOccurrences(rule, 45);
      expect(result).toHaveLength(6);
      // Sep 7 Mon, Sep 9 Wed, Sep 11 Fri, Sep 14 Mon, Sep 16 Wed, Sep 18 Fri
      expect(result[0]!.localDate).toBe("2026-09-07");
      expect(result[1]!.localDate).toBe("2026-09-09");
      expect(result[2]!.localDate).toBe("2026-09-11");
      expect(result[3]!.localDate).toBe("2026-09-14");
    });

    it("handles every 2 weeks", () => {
      const rule: RecurrenceRule = {
        type: "weekly",
        interval: 2,
        daysOfWeek: [2], // Tuesday
        startsOn: "2026-09-01", // Tuesday
        occurrenceCount: 3,
        startsAtLocalTime: "11:00",
        timezone: "UTC",
      };

      const result = generateRecurringOccurrences(rule, 30);
      expect(result).toHaveLength(3);
      expect(result[0]!.localDate).toBe("2026-09-01");
      // Next should be 2 weeks later
      expect(result[1]!.localDate).toBe("2026-09-15");
      expect(result[2]!.localDate).toBe("2026-09-29");
    });
  });

  describe("monthly", () => {
    it("generates monthly on specific day", () => {
      const rule: RecurrenceRule = {
        type: "monthly",
        interval: 1,
        dayOfMonth: 15,
        startsOn: "2026-09-15",
        occurrenceCount: 4,
        startsAtLocalTime: "16:00",
        timezone: "Europe/Belgrade",
      };

      const result = generateRecurringOccurrences(rule, 60);
      expect(result).toHaveLength(4);
      expect(result[0]!.localDate).toBe("2026-09-15");
      expect(result[1]!.localDate).toBe("2026-10-15");
      expect(result[2]!.localDate).toBe("2026-11-15");
      expect(result[3]!.localDate).toBe("2026-12-15");
    });

    it("skips months where day does not exist (e.g., 31st)", () => {
      const rule: RecurrenceRule = {
        type: "monthly",
        interval: 1,
        dayOfMonth: 31,
        startsOn: "2026-01-31",
        occurrenceCount: 5,
        startsAtLocalTime: "10:00",
        timezone: "UTC",
      };

      const result = generateRecurringOccurrences(rule, 30);
      // Jan 31, Mar 31, May 31, Jul 31, Aug 31 (skips Feb, Apr, Jun, Sep, Nov)
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0]!.localDate).toBe("2026-01-31");
      expect(result[1]!.localDate).toBe("2026-03-31");
    });
  });

  describe("bounds", () => {
    it("enforces max 52 occurrences", () => {
      const rule: RecurrenceRule = {
        type: "daily",
        interval: 1,
        startsOn: "2026-01-01",
        occurrenceCount: 100, // exceeds max
        startsAtLocalTime: "10:00",
        timezone: "UTC",
      };

      const result = generateRecurringOccurrences(rule, 30);
      expect(result.length).toBeLessThanOrEqual(52);
    });
  });

  describe("UTC conversion", () => {
    it("produces valid ISO UTC timestamps", () => {
      const rule: RecurrenceRule = {
        type: "daily",
        interval: 1,
        startsOn: "2026-09-01",
        occurrenceCount: 1,
        startsAtLocalTime: "10:00",
        timezone: "Europe/Belgrade",
      };

      const result = generateRecurringOccurrences(rule, 30);
      expect(result[0]!.startsAtUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result[0]!.endsAtUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("duration is correctly reflected in end time", () => {
      const rule: RecurrenceRule = {
        type: "daily",
        interval: 1,
        startsOn: "2026-09-01",
        occurrenceCount: 1,
        startsAtLocalTime: "10:00",
        timezone: "UTC",
      };

      const result = generateRecurringOccurrences(rule, 45);
      const start = new Date(result[0]!.startsAtUtc);
      const end = new Date(result[0]!.endsAtUtc);
      expect(end.getTime() - start.getTime()).toBe(45 * 60_000);
    });
  });

  describe("DST", () => {
    it("local time remains stable across DST (Europe/Belgrade CET→CEST)", () => {
      // CET→CEST transition in 2026: March 29
      const rule: RecurrenceRule = {
        type: "weekly",
        interval: 1,
        daysOfWeek: [1], // Monday
        startsOn: "2026-03-23", // Monday before DST
        occurrenceCount: 3,
        startsAtLocalTime: "10:00",
        timezone: "Europe/Belgrade",
      };

      const result = generateRecurringOccurrences(rule, 60);
      expect(result).toHaveLength(3);
      // All should have local time 10:00
      expect(result[0]!.localTime).toBe("10:00");
      expect(result[1]!.localTime).toBe("10:00");
      expect(result[2]!.localTime).toBe("10:00");
      // But UTC offsets will differ (CET=+1, CEST=+2)
    });
  });
});

describe("formatRecurrenceSummary", () => {
  it("formats daily", () => {
    expect(formatRecurrenceSummary({
      type: "daily", interval: 1, startsOn: "2026-09-01",
      occurrenceCount: 5, startsAtLocalTime: "10:00", timezone: "UTC",
    })).toBe("Every day at 10:00");
  });

  it("formats weekly with days", () => {
    expect(formatRecurrenceSummary({
      type: "weekly", interval: 1, daysOfWeek: [1, 3],
      startsOn: "2026-09-01", occurrenceCount: 5,
      startsAtLocalTime: "14:00", timezone: "UTC",
    })).toBe("Every Monday, Wednesday at 14:00");
  });

  it("formats monthly", () => {
    expect(formatRecurrenceSummary({
      type: "monthly", interval: 1, dayOfMonth: 15,
      startsOn: "2026-09-15", occurrenceCount: 4,
      startsAtLocalTime: "16:00", timezone: "UTC",
    })).toBe("Monthly on the 15th at 16:00");
  });
});
