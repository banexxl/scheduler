/**
 * Unified Customer Types Tests — Milestone 9.2.
 */

import { describe, it, expect } from "vitest";
import type { CustomerUnifiedAppointment, CustomerDashboardSummary } from "../types/unified-customer";

describe("unified customer types", () => {
  it("CustomerUnifiedAppointment has required fields", () => {
    const appt: CustomerUnifiedAppointment = {
      tenantSlug: "test",
      tenantName: "Test Business",
      tenantLogoUrl: null,
      appointmentNumber: "APT-2025-000001",
      status: "confirmed",
      serviceName: "Haircut",
      resourceName: "Ana",
      locationName: "Downtown",
      startsAt: "2025-08-15T14:00:00.000Z",
      endsAt: "2025-08-15T15:00:00.000Z",
      localDate: "2025-08-15",
      localStartTime: "14:00",
      localEndTime: "15:00",
      durationMinutes: 60,
      price: "45.00",
      currency: "USD",
      canCancel: true,
      canReschedule: true,
      canBookAgain: false,
    };
    expect(appt.tenantSlug).toBe("test");
    expect(appt.canBookAgain).toBe(false);
  });

  it("CustomerDashboardSummary represents unified state", () => {
    const summary: CustomerDashboardSummary = {
      upcomingCount: 3,
      linkedBusinessCount: 2,
      nextAppointment: null,
      rewards: [],
    };
    expect(summary.upcomingCount).toBe(3);
    expect(summary.nextAppointment).toBeNull();
  });
});
