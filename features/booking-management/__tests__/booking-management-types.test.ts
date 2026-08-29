import { describe, it, expect } from "vitest";
import type { BookingDetails, TimelineEntry, LookupFormValues } from "../types";

/**
 * Booking Management Types Tests — Milestone 18.0.
 */

describe("BookingDetails type", () => {
  it("has all required fields", () => {
    const booking: BookingDetails = {
      id: "123",
      reference: "APT-2026-000001",
      status: "confirmed",
      customer: { name: "John Doe", email: "john@test.com", phone: "+1234" },
      service: { id: "svc-1", name: "Haircut" },
      staff: { name: "Jane" },
      location: { id: "loc-1", name: "Main" },
      resourceId: "res-1",
      tenantId: "tenant-1",
      startsAt: "2026-09-01T10:00:00Z",
      endsAt: "2026-09-01T10:30:00Z",
      durationMinutes: 30,
      price: "25.00",
      currency: "USD",
      notes: null,
      tenantName: "Acme",
      createdAt: "2026-09-01T08:00:00Z",
      confirmedAt: "2026-09-01T08:00:00Z",
      checkedInAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      noShowAt: null,
    };

    expect(booking.reference).toBe("APT-2026-000001");
    expect(booking.status).toBe("confirmed");
    expect(booking.customer.name).toBe("John Doe");
    expect(booking.durationMinutes).toBe(30);
  });

  it("supports null staff", () => {
    const booking: BookingDetails = {
      id: "123",
      reference: "APT-2026-000002",
      status: "completed",
      customer: { name: "Test", email: "t@t.com", phone: null },
      service: { id: "svc-2", name: "Service" },
      staff: null,
      location: { id: "loc-2", name: "Loc" },
      resourceId: "res-2",
      tenantId: "tenant-2",
      startsAt: "2026-09-01T10:00:00Z",
      endsAt: "2026-09-01T10:30:00Z",
      durationMinutes: 30,
      price: "0",
      currency: "USD",
      notes: null,
      tenantName: "Biz",
      createdAt: "2026-09-01T08:00:00Z",
      confirmedAt: "2026-09-01T08:00:00Z",
      checkedInAt: null,
      completedAt: "2026-09-01T11:00:00Z",
      cancelledAt: null,
      cancellationReason: null,
      noShowAt: null,
    };

    expect(booking.staff).toBeNull();
    expect(booking.completedAt).toBeTruthy();
  });
});

describe("TimelineEntry type", () => {
  it("can represent a completed entry", () => {
    const entry: TimelineEntry = {
      status: "confirmed",
      label: "Confirmed",
      timestamp: "2026-09-01T08:00:00Z",
      active: false,
      completed: true,
    };
    expect(entry.completed).toBe(true);
    expect(entry.timestamp).toBeTruthy();
  });

  it("can represent a future entry", () => {
    const entry: TimelineEntry = {
      status: "completed",
      label: "Completed",
      timestamp: null,
      active: false,
      completed: false,
    };
    expect(entry.timestamp).toBeNull();
    expect(entry.active).toBe(false);
  });
});

describe("LookupFormValues type", () => {
  it("has reference and email", () => {
    const values: LookupFormValues = {
      reference: "APT-2026-000001",
      email: "test@example.com",
    };
    expect(values.reference).toMatch(/^APT-/);
    expect(values.email).toContain("@");
  });
});
