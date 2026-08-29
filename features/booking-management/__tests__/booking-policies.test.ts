import { describe, it, expect } from "vitest";
import type { ModificationPermissions, BookingDetails } from "../types";
import { DEFAULT_BOOKING_POLICIES } from "../types";

/**
 * Booking Policies Tests — Milestone 18.1.
 *
 * Tests policy defaults and permission logic.
 */

describe("DEFAULT_BOOKING_POLICIES", () => {
  it("allows cancellation by default", () => {
    expect(DEFAULT_BOOKING_POLICIES.allowCancellation).toBe(true);
  });

  it("allows reschedule by default", () => {
    expect(DEFAULT_BOOKING_POLICIES.allowReschedule).toBe(true);
  });

  it("has 24-hour cancellation notice", () => {
    expect(DEFAULT_BOOKING_POLICIES.cancellationNoticeMinutes).toBe(1440);
  });

  it("has 24-hour reschedule notice", () => {
    expect(DEFAULT_BOOKING_POLICIES.rescheduleNoticeMinutes).toBe(1440);
  });

  it("allows rescheduling up to 90 days", () => {
    expect(DEFAULT_BOOKING_POLICIES.maxRescheduleDays).toBe(90);
  });
});

describe("ModificationPermissions type", () => {
  it("can represent full permissions", () => {
    const perms: ModificationPermissions = {
      canCancel: true,
      canReschedule: true,
      cancelReason: null,
      rescheduleReason: null,
    };
    expect(perms.canCancel).toBe(true);
    expect(perms.canReschedule).toBe(true);
    expect(perms.cancelReason).toBeNull();
  });

  it("can represent no permissions with reasons", () => {
    const perms: ModificationPermissions = {
      canCancel: false,
      canReschedule: false,
      cancelReason: "Booking already cancelled.",
      rescheduleReason: "Booking already cancelled.",
    };
    expect(perms.canCancel).toBe(false);
    expect(perms.cancelReason).toBeTruthy();
  });

  it("can represent mixed permissions", () => {
    const perms: ModificationPermissions = {
      canCancel: true,
      canReschedule: false,
      cancelReason: null,
      rescheduleReason: "Too close to appointment time.",
    };
    expect(perms.canCancel).toBe(true);
    expect(perms.canReschedule).toBe(false);
  });
});

describe("BookingDetails extended type", () => {
  it("includes tenantId and resource IDs for modifications", () => {
    const booking: BookingDetails = {
      id: "apt-1",
      reference: "APT-2026-000001",
      status: "confirmed",
      customer: { name: "Test User", email: "test@test.com", phone: "+1234" },
      service: { id: "svc-1", name: "Haircut" },
      staff: { name: "Jane" },
      location: { id: "loc-1", name: "Main" },
      resourceId: "res-1",
      tenantId: "tenant-1",
      startsAt: "2026-09-15T10:00:00Z",
      endsAt: "2026-09-15T10:30:00Z",
      durationMinutes: 30,
      price: "25.00",
      currency: "USD",
      notes: null,
      tenantName: "Acme Salon",
      createdAt: "2026-09-01T08:00:00Z",
      confirmedAt: "2026-09-01T08:00:00Z",
      checkedInAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      noShowAt: null,
    };

    expect(booking.tenantId).toBe("tenant-1");
    expect(booking.service.id).toBe("svc-1");
    expect(booking.location.id).toBe("loc-1");
    expect(booking.resourceId).toBe("res-1");
  });
});
