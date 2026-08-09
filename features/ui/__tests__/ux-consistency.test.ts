import { describe, it, expect } from "vitest";
import {
  formatAppointmentStatus,
  formatPaymentStatus,
  formatOperationalState,
  APPOINTMENT_STATUS_DISPLAY,
  PAYMENT_STATUS_DISPLAY,
  OPERATIONAL_STATE_DISPLAY,
} from "../status-labels";
import {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatDuration,
} from "../date-time-formatters";

/**
 * UX Consistency Tests — Milestone 12.7.
 */

describe("appointment status labels", () => {
  it("all statuses have human-readable labels", () => {
    const statuses = ["pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"];
    for (const s of statuses) {
      expect(APPOINTMENT_STATUS_DISPLAY[s]).toBeDefined();
      expect(APPOINTMENT_STATUS_DISPLAY[s]).not.toBe(s); // Not raw enum
    }
  });

  it("formatAppointmentStatus returns label", () => {
    expect(formatAppointmentStatus("checked_in")).toBe("Checked in");
    expect(formatAppointmentStatus("no_show")).toBe("No-show");
  });

  it("unknown status returns as-is", () => {
    expect(formatAppointmentStatus("unknown_value")).toBe("unknown_value");
  });
});

describe("payment status labels", () => {
  it("all payment statuses have labels", () => {
    const statuses = ["not_required", "unpaid", "pending", "paid", "refunded"];
    for (const s of statuses) {
      expect(PAYMENT_STATUS_DISPLAY[s]).toBeDefined();
    }
  });

  it("formatPaymentStatus returns customer-friendly label", () => {
    expect(formatPaymentStatus("not_required")).toBe("Pay at business");
    expect(formatPaymentStatus("unpaid")).toBe("Payment required");
    expect(formatPaymentStatus("paid")).toBe("Paid");
  });
});

describe("operational state labels", () => {
  it("all states have labels", () => {
    const states = ["upcoming", "starting_soon", "late", "checked_in", "in_progress", "completed"];
    for (const s of states) {
      expect(OPERATIONAL_STATE_DISPLAY[s]).toBeDefined();
    }
  });

  it("formatOperationalState works", () => {
    expect(formatOperationalState("starting_soon")).toBe("Starting soon");
    expect(formatOperationalState("late")).toBe("Late");
  });
});

describe("date formatting", () => {
  it("formatDate produces readable date", () => {
    const result = formatDate("2026-08-09T14:30:00.000Z");
    expect(result).toContain("2026");
    expect(result).toContain("9");
  });

  it("formatTime extracts HH:MM", () => {
    expect(formatTime("2026-08-09T14:30:00.000Z")).toBe("14:30");
    expect(formatTime("2026-08-09T09:00:00.000Z")).toBe("09:00");
  });
});

describe("relative time", () => {
  it("very recent is 'just now'", () => {
    const now = new Date(Date.now() + 10_000).toISOString(); // 10s from now
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("future minutes shows 'in X min'", () => {
    const future = new Date(Date.now() + 20 * 60_000).toISOString();
    const result = formatRelativeTime(future);
    expect(result).toMatch(/in \d+ min/);
  });

  it("past minutes shows 'X min ago'", () => {
    const past = new Date(Date.now() - 45 * 60_000).toISOString();
    const result = formatRelativeTime(past);
    expect(result).toMatch(/\d+ min ago/);
  });
});

describe("duration formatting", () => {
  it("short durations", () => {
    expect(formatDuration(30)).toBe("30min");
    expect(formatDuration(45)).toBe("45min");
  });

  it("hour durations", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30min");
    expect(formatDuration(120)).toBe("2h");
  });
});

describe("consistency contracts", () => {
  it("no raw enum displayed to users", () => {
    // All display maps use human-friendly casing
    for (const label of Object.values(APPOINTMENT_STATUS_DISPLAY)) {
      expect(label).not.toContain("_");
    }
    for (const label of Object.values(PAYMENT_STATUS_DISPLAY)) {
      expect(label[0]).toBe(label[0]!.toUpperCase()); // Capitalized
    }
  });

  it("status labels never say revenue/profit", () => {
    for (const label of Object.values(PAYMENT_STATUS_DISPLAY)) {
      expect(label.toLowerCase()).not.toContain("revenue");
      expect(label.toLowerCase()).not.toContain("profit");
    }
  });
});
