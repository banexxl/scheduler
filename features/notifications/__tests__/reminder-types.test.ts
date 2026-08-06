/**
 * Reminder Types and Utility Tests — Milestone 6.13.
 *
 * Tests for offset formatting, conversion utilities, constants, and presets.
 */

import { describe, it, expect } from "vitest";
import {
  formatReminderOffset,
  toOffsetMinutes,
  fromOffsetMinutes,
  REMINDER_OFFSET_PRESETS,
  REMINDER_OFFSET_UNITS,
  REMINDER_STATUSES,
  REMINDER_ELIGIBLE_APPOINTMENT_STATUSES,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_TEMPLATE_TYPES,
  SUPPORTED_TEMPLATE_VARIABLES,
} from "../types/notification";

describe("formatReminderOffset", () => {
  it("formats minutes correctly", () => {
    expect(formatReminderOffset(5)).toBe("5 minutes");
    expect(formatReminderOffset(30)).toBe("30 minutes");
    expect(formatReminderOffset(45)).toBe("45 minutes");
    expect(formatReminderOffset(1)).toBe("1 minute");
  });

  it("formats hours correctly", () => {
    expect(formatReminderOffset(60)).toBe("1 hour");
    expect(formatReminderOffset(120)).toBe("2 hours");
    expect(formatReminderOffset(180)).toBe("3 hours");
    expect(formatReminderOffset(1440 - 60)).toBe("23 hours");
  });

  it("formats days correctly", () => {
    expect(formatReminderOffset(1440)).toBe("1 day");
    expect(formatReminderOffset(2880)).toBe("2 days");
    expect(formatReminderOffset(10080)).toBe("7 days");
  });

  it("prefers days over hours when evenly divisible", () => {
    expect(formatReminderOffset(1440)).toBe("1 day");
    expect(formatReminderOffset(2880)).toBe("2 days");
  });

  it("prefers hours over minutes when evenly divisible", () => {
    expect(formatReminderOffset(60)).toBe("1 hour");
    expect(formatReminderOffset(120)).toBe("2 hours");
  });

  it("uses minutes for non-hour-divisible values", () => {
    expect(formatReminderOffset(90)).toBe("90 minutes");
    expect(formatReminderOffset(15)).toBe("15 minutes");
  });
});

describe("toOffsetMinutes", () => {
  it("converts minutes correctly", () => {
    expect(toOffsetMinutes(30, "minutes")).toBe(30);
    expect(toOffsetMinutes(5, "minutes")).toBe(5);
  });

  it("converts hours correctly", () => {
    expect(toOffsetMinutes(1, "hours")).toBe(60);
    expect(toOffsetMinutes(24, "hours")).toBe(1440);
  });

  it("converts days correctly", () => {
    expect(toOffsetMinutes(1, "days")).toBe(1440);
    expect(toOffsetMinutes(7, "days")).toBe(10080);
  });
});

describe("fromOffsetMinutes", () => {
  it("returns days when evenly divisible by 1440", () => {
    expect(fromOffsetMinutes(1440)).toEqual({ amount: 1, unit: "days" });
    expect(fromOffsetMinutes(2880)).toEqual({ amount: 2, unit: "days" });
    expect(fromOffsetMinutes(10080)).toEqual({ amount: 7, unit: "days" });
  });

  it("returns hours when evenly divisible by 60 but not 1440", () => {
    expect(fromOffsetMinutes(60)).toEqual({ amount: 1, unit: "hours" });
    expect(fromOffsetMinutes(120)).toEqual({ amount: 2, unit: "hours" });
    expect(fromOffsetMinutes(360)).toEqual({ amount: 6, unit: "hours" });
  });

  it("returns minutes for other values", () => {
    expect(fromOffsetMinutes(30)).toEqual({ amount: 30, unit: "minutes" });
    expect(fromOffsetMinutes(90)).toEqual({ amount: 90, unit: "minutes" });
    expect(fromOffsetMinutes(5)).toEqual({ amount: 5, unit: "minutes" });
  });

  it("round-trips with toOffsetMinutes", () => {
    const testCases = [5, 30, 60, 120, 1440, 2880, 10080];
    for (const minutes of testCases) {
      const { amount, unit } = fromOffsetMinutes(minutes);
      expect(toOffsetMinutes(amount, unit)).toBe(minutes);
    }
  });
});

describe("reminder constants", () => {
  it("includes appointment_reminder in event types", () => {
    expect(NOTIFICATION_EVENT_TYPES).toContain("appointment_reminder");
  });

  it("includes appointment_reminder in template types", () => {
    expect(NOTIFICATION_TEMPLATE_TYPES).toContain("appointment_reminder");
  });

  it("includes reminder_offset in supported variables", () => {
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("reminder_offset");
  });

  it("has 6 reminder statuses", () => {
    expect(REMINDER_STATUSES).toHaveLength(6);
    expect(REMINDER_STATUSES).toContain("pending");
    expect(REMINDER_STATUSES).toContain("processing");
    expect(REMINDER_STATUSES).toContain("enqueued");
    expect(REMINDER_STATUSES).toContain("sent");
    expect(REMINDER_STATUSES).toContain("cancelled");
    expect(REMINDER_STATUSES).toContain("failed");
  });

  it("defines eligible appointment statuses", () => {
    expect(REMINDER_ELIGIBLE_APPOINTMENT_STATUSES).toContain("pending");
    expect(REMINDER_ELIGIBLE_APPOINTMENT_STATUSES).toContain("confirmed");
    expect(REMINDER_ELIGIBLE_APPOINTMENT_STATUSES).not.toContain("cancelled");
    expect(REMINDER_ELIGIBLE_APPOINTMENT_STATUSES).not.toContain("completed");
  });

  it("has 3 offset units", () => {
    expect(REMINDER_OFFSET_UNITS).toEqual(["minutes", "hours", "days"]);
  });
});

describe("reminder offset presets", () => {
  it("has sensible presets", () => {
    expect(REMINDER_OFFSET_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it("each preset has a label and valid offsetMinutes", () => {
    for (const preset of REMINDER_OFFSET_PRESETS) {
      expect(preset.label).toBeDefined();
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.offsetMinutes).toBeGreaterThanOrEqual(5);
      expect(preset.offsetMinutes).toBeLessThanOrEqual(525600);
    }
  });

  it("presets are in ascending order", () => {
    for (let i = 1; i < REMINDER_OFFSET_PRESETS.length; i++) {
      expect(REMINDER_OFFSET_PRESETS[i]!.offsetMinutes).toBeGreaterThan(
        REMINDER_OFFSET_PRESETS[i - 1]!.offsetMinutes
      );
    }
  });
});
