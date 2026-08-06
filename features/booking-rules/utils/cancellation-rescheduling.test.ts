/**
 * Tests for cancellation and rescheduling helpers — Milestone 6.8.
 */

import { describe, it, expect } from "vitest";
import { canCustomerCancelAppointment, canCustomerRescheduleAppointment } from "./cancellation-rescheduling";
import type { ResolvedBookingRules } from "../types/booking-rules";

// ─── Fixture ─────────────────────────────────────────────────────────────────

function makeRules(overrides: Partial<ResolvedBookingRules> = {}): ResolvedBookingRules {
  return {
    minimumNoticeMinutes: 0,
    maximumAdvanceDays: 90,
    slotIntervalMinutes: 15,
    cancellationNoticeMinutes: 60,
    rescheduleNoticeMinutes: 120,
    allowSameDayBooking: true,
    allowCustomerCancellation: true,
    allowCustomerRescheduling: true,
    requireCustomerPhone: false,
    requireCustomerEmail: true,
    sources: {
      minimumNotice: "tenant",
      maximumAdvance: "tenant",
      slotInterval: "tenant",
      cancellationNotice: "tenant",
      rescheduleNotice: "tenant",
      allowSameDayBooking: "tenant",
      allowCustomerCancellation: "tenant",
      allowCustomerRescheduling: "tenant",
      requireCustomerPhone: "tenant",
      requireCustomerEmail: "tenant",
    },
    ...overrides,
  };
}

// ─── Cancellation Tests ──────────────────────────────────────────────────────

describe("canCustomerCancelAppointment", () => {
  it("allows cancellation with sufficient notice", () => {
    const rules = makeRules({ cancellationNoticeMinutes: 60 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T13:00:00Z"); // 2h before → 120min > 60min

    const result = canCustomerCancelAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("denies cancellation when flag is false", () => {
    const rules = makeRules({ allowCustomerCancellation: false });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T10:00:00Z"); // plenty of time

    const result = canCustomerCancelAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CANCELLATION_NOT_ALLOWED");
  });

  it("denies cancellation at exact threshold (insufficient notice)", () => {
    const rules = makeRules({ cancellationNoticeMinutes: 60 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    // now = 14:00:00.001 → remaining = 59.999... min < 60 min
    const now = new Date("2025-08-06T14:00:00.001Z");

    const result = canCustomerCancelAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT_NOTICE");
  });

  it("allows cancellation exactly at the boundary", () => {
    const rules = makeRules({ cancellationNoticeMinutes: 60 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T14:00:00.000Z"); // exactly 60 min

    const result = canCustomerCancelAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(true);
  });

  it("allows cancellation when notice is zero", () => {
    const rules = makeRules({ cancellationNoticeMinutes: 0 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T14:59:00Z"); // 1 minute before

    const result = canCustomerCancelAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(true);
  });

  it("accepts ISO string for appointment start", () => {
    const rules = makeRules({ cancellationNoticeMinutes: 30 });
    const now = new Date("2025-08-06T14:00:00Z");

    const result = canCustomerCancelAppointment(rules, "2025-08-06T15:00:00Z", now);
    expect(result.allowed).toBe(true);
  });
});

// ─── Rescheduling Tests ──────────────────────────────────────────────────────

describe("canCustomerRescheduleAppointment", () => {
  it("allows rescheduling with sufficient notice", () => {
    const rules = makeRules({ rescheduleNoticeMinutes: 120 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T12:00:00Z"); // 3h before → 180min > 120min

    const result = canCustomerRescheduleAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("denies rescheduling when flag is false", () => {
    const rules = makeRules({ allowCustomerRescheduling: false });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T10:00:00Z");

    const result = canCustomerRescheduleAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("RESCHEDULING_NOT_ALLOWED");
  });

  it("denies rescheduling below threshold", () => {
    const rules = makeRules({ rescheduleNoticeMinutes: 120 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T13:30:00Z"); // 90min < 120min

    const result = canCustomerRescheduleAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT_NOTICE");
  });

  it("allows rescheduling when notice is zero", () => {
    const rules = makeRules({ rescheduleNoticeMinutes: 0 });
    const appointmentStart = new Date("2025-08-06T15:00:00Z");
    const now = new Date("2025-08-06T14:59:00Z");

    const result = canCustomerRescheduleAppointment(rules, appointmentStart, now);
    expect(result.allowed).toBe(true);
  });
});
