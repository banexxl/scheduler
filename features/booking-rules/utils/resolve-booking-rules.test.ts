/**
 * Tests for resolveBookingRules — Milestone 6.8.
 */

import { describe, it, expect } from "vitest";
import { resolveBookingRules } from "./resolve-booking-rules";
import { BOOKING_RULE_DEFAULTS } from "../types/booking-rules";
import type { TenantBookingRules, ServiceBookingRules } from "../types/booking-rules";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTenantRules(overrides: Partial<TenantBookingRules> = {}): TenantBookingRules {
  return {
    id: "t-rule-1",
    tenantId: "tenant-1",
    minimumNoticeMinutes: 60,
    maximumAdvanceDays: 30,
    slotIntervalMinutes: 15,
    cancellationNoticeMinutes: 120,
    rescheduleNoticeMinutes: 120,
    allowSameDayBooking: true,
    allowCustomerCancellation: true,
    allowCustomerRescheduling: true,
    requireCustomerPhone: false,
    requireCustomerEmail: true,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeServiceRules(overrides: Partial<ServiceBookingRules> = {}): ServiceBookingRules {
  return {
    id: "s-rule-1",
    tenantId: "tenant-1",
    serviceId: "service-1",
    minimumNoticeMinutes: null,
    maximumAdvanceDays: null,
    slotIntervalMinutes: null,
    cancellationNoticeMinutes: null,
    rescheduleNoticeMinutes: null,
    allowSameDayBooking: null,
    allowCustomerCancellation: null,
    allowCustomerRescheduling: null,
    requireCustomerPhone: null,
    requireCustomerEmail: null,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("resolveBookingRules", () => {
  it("uses application defaults when no tenant row exists", () => {
    const result = resolveBookingRules({ tenantRules: null, serviceRules: null });

    expect(result.minimumNoticeMinutes).toBe(BOOKING_RULE_DEFAULTS.minimumNoticeMinutes);
    expect(result.maximumAdvanceDays).toBe(BOOKING_RULE_DEFAULTS.maximumAdvanceDays);
    expect(result.slotIntervalMinutes).toBe(BOOKING_RULE_DEFAULTS.slotIntervalMinutes);
    expect(result.allowSameDayBooking).toBe(BOOKING_RULE_DEFAULTS.allowSameDayBooking);
    expect(result.requireCustomerEmail).toBe(BOOKING_RULE_DEFAULTS.requireCustomerEmail);

    // All sources should be "default"
    expect(result.sources.minimumNotice).toBe("default");
    expect(result.sources.maximumAdvance).toBe("default");
    expect(result.sources.slotInterval).toBe("default");
  });

  it("uses tenant values when tenant row exists", () => {
    const tenantRules = makeTenantRules({ minimumNoticeMinutes: 120, maximumAdvanceDays: 60 });
    const result = resolveBookingRules({ tenantRules, serviceRules: null });

    expect(result.minimumNoticeMinutes).toBe(120);
    expect(result.maximumAdvanceDays).toBe(60);
    expect(result.sources.minimumNotice).toBe("tenant");
    expect(result.sources.maximumAdvance).toBe("tenant");
  });

  it("service override wins over tenant default", () => {
    const tenantRules = makeTenantRules({ slotIntervalMinutes: 15 });
    const serviceRules = makeServiceRules({ slotIntervalMinutes: 30 });
    const result = resolveBookingRules({ tenantRules, serviceRules });

    expect(result.slotIntervalMinutes).toBe(30);
    expect(result.sources.slotInterval).toBe("service");
  });

  it("null service override inherits from tenant", () => {
    const tenantRules = makeTenantRules({ minimumNoticeMinutes: 45 });
    const serviceRules = makeServiceRules({ minimumNoticeMinutes: null });
    const result = resolveBookingRules({ tenantRules, serviceRules });

    expect(result.minimumNoticeMinutes).toBe(45);
    expect(result.sources.minimumNotice).toBe("tenant");
  });

  it("preserves explicit zero from service override", () => {
    const tenantRules = makeTenantRules({ minimumNoticeMinutes: 60 });
    const serviceRules = makeServiceRules({ minimumNoticeMinutes: 0 });
    const result = resolveBookingRules({ tenantRules, serviceRules });

    expect(result.minimumNoticeMinutes).toBe(0);
    expect(result.sources.minimumNotice).toBe("service");
  });

  it("preserves explicit false from service override", () => {
    const tenantRules = makeTenantRules({ allowSameDayBooking: true });
    const serviceRules = makeServiceRules({ allowSameDayBooking: false });
    const result = resolveBookingRules({ tenantRules, serviceRules });

    expect(result.allowSameDayBooking).toBe(false);
    expect(result.sources.allowSameDayBooking).toBe("service");
  });

  it("ignores inactive service override (treats all fields as null)", () => {
    const tenantRules = makeTenantRules({ slotIntervalMinutes: 15 });
    const serviceRules = makeServiceRules({ slotIntervalMinutes: 45, isActive: false });
    const result = resolveBookingRules({ tenantRules, serviceRules });

    expect(result.slotIntervalMinutes).toBe(15);
    expect(result.sources.slotInterval).toBe("tenant");
  });

  it("preserves explicit zero from tenant when service is null", () => {
    const tenantRules = makeTenantRules({ cancellationNoticeMinutes: 0 });
    const result = resolveBookingRules({ tenantRules, serviceRules: null });

    expect(result.cancellationNoticeMinutes).toBe(0);
    expect(result.sources.cancellationNotice).toBe("tenant");
  });

  it("preserves explicit false from tenant when no service override", () => {
    const tenantRules = makeTenantRules({ allowCustomerCancellation: false });
    const result = resolveBookingRules({ tenantRules, serviceRules: null });

    expect(result.allowCustomerCancellation).toBe(false);
    expect(result.sources.allowCustomerCancellation).toBe("tenant");
  });

  it("mixes sources correctly across fields", () => {
    const tenantRules = makeTenantRules({
      minimumNoticeMinutes: 30,
      maximumAdvanceDays: 60,
      slotIntervalMinutes: 20,
    });
    const serviceRules = makeServiceRules({
      minimumNoticeMinutes: 90,
      maximumAdvanceDays: null, // inherit
      slotIntervalMinutes: null, // inherit
      allowSameDayBooking: false, // override
    });
    const result = resolveBookingRules({ tenantRules, serviceRules });

    expect(result.minimumNoticeMinutes).toBe(90);
    expect(result.sources.minimumNotice).toBe("service");

    expect(result.maximumAdvanceDays).toBe(60);
    expect(result.sources.maximumAdvance).toBe("tenant");

    expect(result.slotIntervalMinutes).toBe(20);
    expect(result.sources.slotInterval).toBe("tenant");

    expect(result.allowSameDayBooking).toBe(false);
    expect(result.sources.allowSameDayBooking).toBe("service");
  });
});
