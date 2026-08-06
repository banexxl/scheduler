/**
 * Domain types for booking rules — Milestone 6.8.
 *
 * Booking rules define constraints on when candidate availability slots
 * may be booked. They do NOT define availability itself (that is Milestone 6.7).
 *
 * Two levels:
 * 1. Tenant defaults (one row per tenant, all fields required)
 * 2. Service overrides (nullable fields inherit from tenant)
 *
 * Resolution order: service override ?? tenant default ?? application default
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const BOOKING_RULE_DEFAULTS = {
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
} as const satisfies BookingRuleDefaults;

export const BOOKING_RULE_BOUNDS = {
  minimumNoticeMinutes: { min: 0, max: 525600 },
  maximumAdvanceDays: { min: 1, max: 730 },
  slotIntervalMinutes: { min: 5, max: 120 },
  cancellationNoticeMinutes: { min: 0, max: 525600 },
  rescheduleNoticeMinutes: { min: 0, max: 525600 },
} as const;

// ─── Application Defaults Type ───────────────────────────────────────────────

export type BookingRuleDefaults = {
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  slotIntervalMinutes: number;
  cancellationNoticeMinutes: number;
  rescheduleNoticeMinutes: number;
  allowSameDayBooking: boolean;
  allowCustomerCancellation: boolean;
  allowCustomerRescheduling: boolean;
  requireCustomerPhone: boolean;
  requireCustomerEmail: boolean;
};

// ─── Tenant Booking Rules (database row shape) ───────────────────────────────

export type TenantBookingRules = {
  id: string;
  tenantId: string;
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  slotIntervalMinutes: number;
  cancellationNoticeMinutes: number;
  rescheduleNoticeMinutes: number;
  allowSameDayBooking: boolean;
  allowCustomerCancellation: boolean;
  allowCustomerRescheduling: boolean;
  requireCustomerPhone: boolean;
  requireCustomerEmail: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantBookingRulesInput = {
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  slotIntervalMinutes: number;
  cancellationNoticeMinutes: number;
  rescheduleNoticeMinutes: number;
  allowSameDayBooking: boolean;
  allowCustomerCancellation: boolean;
  allowCustomerRescheduling: boolean;
  requireCustomerPhone: boolean;
  requireCustomerEmail: boolean;
};

// ─── Service Booking Rules (database row shape, nullable overrides) ──────────

export type ServiceBookingRules = {
  id: string;
  tenantId: string;
  serviceId: string;
  minimumNoticeMinutes: number | null;
  maximumAdvanceDays: number | null;
  slotIntervalMinutes: number | null;
  cancellationNoticeMinutes: number | null;
  rescheduleNoticeMinutes: number | null;
  allowSameDayBooking: boolean | null;
  allowCustomerCancellation: boolean | null;
  allowCustomerRescheduling: boolean | null;
  requireCustomerPhone: boolean | null;
  requireCustomerEmail: boolean | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceBookingRulesInput = {
  minimumNoticeMinutes: number | null;
  maximumAdvanceDays: number | null;
  slotIntervalMinutes: number | null;
  cancellationNoticeMinutes: number | null;
  rescheduleNoticeMinutes: number | null;
  allowSameDayBooking: boolean | null;
  allowCustomerCancellation: boolean | null;
  allowCustomerRescheduling: boolean | null;
  requireCustomerPhone: boolean | null;
  requireCustomerEmail: boolean | null;
};

// ─── Booking Rule Source ─────────────────────────────────────────────────────

export type BookingRuleSource = "tenant" | "service" | "default";

// ─── Resolved Booking Rules ──────────────────────────────────────────────────

export type ResolvedBookingRules = {
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  slotIntervalMinutes: number;
  cancellationNoticeMinutes: number;
  rescheduleNoticeMinutes: number;
  allowSameDayBooking: boolean;
  allowCustomerCancellation: boolean;
  allowCustomerRescheduling: boolean;
  requireCustomerPhone: boolean;
  requireCustomerEmail: boolean;

  sources: {
    minimumNotice: BookingRuleSource;
    maximumAdvance: BookingRuleSource;
    slotInterval: BookingRuleSource;
    cancellationNotice: BookingRuleSource;
    rescheduleNotice: BookingRuleSource;
    allowSameDayBooking: BookingRuleSource;
    allowCustomerCancellation: BookingRuleSource;
    allowCustomerRescheduling: BookingRuleSource;
    requireCustomerPhone: BookingRuleSource;
    requireCustomerEmail: BookingRuleSource;
  };
};

// ─── Availability Reason Codes (booking-rule-specific) ───────────────────────

export type BookingRuleReasonCode =
  | "SAME_DAY_BOOKING_DISABLED"
  | "MINIMUM_NOTICE_NOT_MET"
  | "MAXIMUM_ADVANCE_EXCEEDED"
  | "BOOKING_RULES_INACTIVE";

// ─── Slot Filter Result ──────────────────────────────────────────────────────

export type SlotFilterResult = {
  slots: import("@/features/availability/types/availability").AvailabilitySlot[];
  removedCounts: {
    past: number;
    sameDayDisabled: number;
    minimumNotice: number;
    maximumAdvance: number;
  };
  reasonCode?: BookingRuleReasonCode;
};

// ─── Helper Conversion ───────────────────────────────────────────────────────

/** Convert minutes to a human-readable string (e.g., "2 hours", "1 day 3 hours") */
export function formatNoticeMinutes(minutes: number): string {
  if (minutes === 0) return "None";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (mins > 0) parts.push(`${mins} min`);
  return parts.join(" ");
}
