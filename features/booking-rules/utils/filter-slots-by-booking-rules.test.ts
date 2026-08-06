/**
 * Tests for filterSlotsByBookingRules — Milestone 6.8.
 */

import { describe, it, expect } from "vitest";
import { filterSlotsByBookingRules } from "./filter-slots-by-booking-rules";
import type { AvailabilitySlot } from "@/features/availability/types/availability";
import type { ResolvedBookingRules } from "../types/booking-rules";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSlot(startsAtISO: string): AvailabilitySlot {
  const startMs = new Date(startsAtISO).getTime();
  const endMs = startMs + 60 * 60_000; // 1 hour service
  return {
    resourceId: "r1",
    serviceId: "s1",
    locationId: "l1",
    localDate: startsAtISO.slice(0, 10),
    startsAt: startsAtISO,
    endsAt: new Date(endMs).toISOString(),
    localStartTime: "10:00",
    localEndTime: "11:00",
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    occupiedWindowStartsAt: startsAtISO,
    occupiedWindowEndsAt: new Date(endMs).toISOString(),
    price: "50.00",
    currency: "USD",
    source: { locationHours: "weekly", resourceHours: "weekly", serviceValues: "base" },
  };
}

function makeRules(overrides: Partial<ResolvedBookingRules> = {}): ResolvedBookingRules {
  return {
    minimumNoticeMinutes: 0,
    maximumAdvanceDays: 90,
    slotIntervalMinutes: 15,
    cancellationNoticeMinutes: 0,
    rescheduleNoticeMinutes: 0,
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("filterSlotsByBookingRules", () => {
  describe("minimum notice", () => {
    it("passes slot exactly at notice threshold", () => {
      // now = 10:00, notice = 60 min, threshold = 11:00
      // slot starts at 11:00 → passes (>= threshold)
      const now = new Date("2025-08-06T10:00:00Z");
      const slot = makeSlot("2025-08-06T11:00:00Z");
      const rules = makeRules({ minimumNoticeMinutes: 60 });

      const result = filterSlotsByBookingRules({
        slots: [slot],
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(1);
      expect(result.removedCounts.minimumNotice).toBe(0);
    });

    it("removes slot one millisecond before notice threshold", () => {
      // now = 10:00:00.001, notice = 60 min, threshold = 11:00:00.001
      // slot starts at 11:00:00.000 → fails (< threshold)
      const now = new Date("2025-08-06T10:00:00.001Z");
      const slot = makeSlot("2025-08-06T11:00:00.000Z");
      const rules = makeRules({ minimumNoticeMinutes: 60 });

      const result = filterSlotsByBookingRules({
        slots: [slot],
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(0);
      expect(result.removedCounts.minimumNotice).toBe(1);
    });

    it("filters some slots and keeps others with minimum notice", () => {
      const now = new Date("2025-08-06T10:00:00Z");
      const rules = makeRules({ minimumNoticeMinutes: 60 });

      const slots = [
        makeSlot("2025-08-06T10:30:00Z"), // before threshold → removed
        makeSlot("2025-08-06T11:00:00Z"), // at threshold → kept
        makeSlot("2025-08-06T11:15:00Z"), // after threshold → kept
      ];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(2);
      expect(result.removedCounts.minimumNotice).toBe(1);
    });
  });

  describe("same-day booking", () => {
    it("allows all slots when same-day is enabled", () => {
      const now = new Date("2025-08-06T08:00:00Z");
      const rules = makeRules({ allowSameDayBooking: true });
      const slots = [makeSlot("2025-08-06T10:00:00Z"), makeSlot("2025-08-06T11:00:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(2);
      expect(result.removedCounts.sameDayDisabled).toBe(0);
    });

    it("removes all slots when same-day is disabled and date is today", () => {
      const now = new Date("2025-08-06T08:00:00Z");
      const rules = makeRules({ allowSameDayBooking: false });
      const slots = [makeSlot("2025-08-06T10:00:00Z"), makeSlot("2025-08-06T14:00:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(0);
      expect(result.removedCounts.sameDayDisabled).toBe(2);
      expect(result.reasonCode).toBe("SAME_DAY_BOOKING_DISABLED");
    });

    it("does not affect future dates when same-day is disabled", () => {
      const now = new Date("2025-08-06T08:00:00Z");
      const rules = makeRules({ allowSameDayBooking: false });
      const slots = [makeSlot("2025-08-07T10:00:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-07",
      });

      expect(result.slots).toHaveLength(1);
      expect(result.removedCounts.sameDayDisabled).toBe(0);
    });
  });

  describe("maximum advance", () => {
    it("allows slot on the last valid date", () => {
      // Today: 2025-08-06 UTC, max advance: 30 days → last valid: 2025-09-05
      const now = new Date("2025-08-06T10:00:00Z");
      const rules = makeRules({ maximumAdvanceDays: 30 });
      const slots = [makeSlot("2025-09-05T10:00:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-09-05",
      });

      expect(result.slots).toHaveLength(1);
      expect(result.removedCounts.maximumAdvance).toBe(0);
    });

    it("removes all slots one day beyond maximum advance", () => {
      // Today: 2025-08-06 UTC, max advance: 30 days → last valid: 2025-09-05
      const now = new Date("2025-08-06T10:00:00Z");
      const rules = makeRules({ maximumAdvanceDays: 30 });
      const slots = [makeSlot("2025-09-06T10:00:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-09-06",
      });

      expect(result.slots).toHaveLength(0);
      expect(result.removedCounts.maximumAdvance).toBe(1);
      expect(result.reasonCode).toBe("MAXIMUM_ADVANCE_EXCEEDED");
    });
  });

  describe("tenant-local date differs from UTC date", () => {
    it("uses tenant timezone for same-day determination", () => {
      // UTC time: 2025-08-06T23:30:00Z → in America/New_York: Aug 6 19:30
      // Requested date: 2025-08-06 (still today in NY)
      const now = new Date("2025-08-06T23:30:00Z");
      const rules = makeRules({ allowSameDayBooking: false });
      const slots = [makeSlot("2025-08-06T23:45:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "America/New_York",
        requestedLocalDate: "2025-08-06",
      });

      // In NY it's still Aug 6, so same-day blocking applies
      expect(result.slots).toHaveLength(0);
      expect(result.removedCounts.sameDayDisabled).toBe(1);
    });

    it("uses tenant timezone for max advance calculation", () => {
      // UTC: 2025-08-07T02:00:00Z → in America/New_York: Aug 6 22:00
      // So "today" in NY is Aug 6, max advance 30 → last valid: Sep 5
      const now = new Date("2025-08-07T02:00:00Z");
      const rules = makeRules({ maximumAdvanceDays: 30 });
      const slots = [makeSlot("2025-09-05T15:00:00Z")];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "America/New_York",
        requestedLocalDate: "2025-09-05",
      });

      // Sep 5 is within 30 days of Aug 6 in NY timezone
      expect(result.slots).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("returns empty result for empty input", () => {
      const now = new Date("2025-08-06T10:00:00Z");
      const rules = makeRules();

      const result = filterSlotsByBookingRules({
        slots: [],
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(0);
      expect(result.reasonCode).toBeUndefined();
    });

    it("removes past slots", () => {
      const now = new Date("2025-08-06T12:00:00Z");
      const rules = makeRules({ minimumNoticeMinutes: 0 });
      const slots = [
        makeSlot("2025-08-06T11:00:00Z"), // past
        makeSlot("2025-08-06T12:30:00Z"), // future
      ];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(1);
      expect(result.removedCounts.past).toBe(1);
    });

    it("returns reason code when all slots filtered by minimum notice", () => {
      const now = new Date("2025-08-06T10:00:00Z");
      const rules = makeRules({ minimumNoticeMinutes: 480 }); // 8 hours
      const slots = [
        makeSlot("2025-08-06T14:00:00Z"), // 4h from now, less than 8h notice
        makeSlot("2025-08-06T16:00:00Z"), // 6h from now, less than 8h notice
      ];

      const result = filterSlotsByBookingRules({
        slots,
        rules,
        now,
        tenantTimeZone: "UTC",
        requestedLocalDate: "2025-08-06",
      });

      expect(result.slots).toHaveLength(0);
      expect(result.reasonCode).toBe("MINIMUM_NOTICE_NOT_MET");
    });
  });
});
