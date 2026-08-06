/**
 * Pure booking-rule resolution utility — Milestone 6.8.
 *
 * Resolves effective booking rules by merging:
 *   service override ?? tenant default ?? application default
 *
 * Key behaviors:
 * - Uses NULLISH fallback (??) — preserves explicit `false` and explicit `0`
 * - Ignores inactive service override rows (treats all fields as null)
 * - Tracks the source of each resolved value for management UI and debugging
 * - No database access, no mutation, fully deterministic
 */

import type {
  TenantBookingRules,
  ServiceBookingRules,
  ResolvedBookingRules,
  BookingRuleDefaults,
  BookingRuleSource,
} from "../types/booking-rules";
import { BOOKING_RULE_DEFAULTS } from "../types/booking-rules";

// ─── Input Types ─────────────────────────────────────────────────────────────

export type ResolveBookingRulesInput = {
  /** Tenant booking rules row (null if no row exists for this tenant) */
  tenantRules: TenantBookingRules | null;
  /** Service booking rules override row (null if no override exists) */
  serviceRules: ServiceBookingRules | null;
  /** Application-level defaults (optional, uses BOOKING_RULE_DEFAULTS if not provided) */
  defaults?: BookingRuleDefaults;
};

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolves effective booking rules from the three-level cascade.
 *
 * Resolution order per field:
 *   1. Active service override (non-null value)
 *   2. Tenant default (from row)
 *   3. Application default constant
 *
 * An inactive service override row is treated as if it doesn't exist.
 */
export function resolveBookingRules(input: ResolveBookingRulesInput): ResolvedBookingRules {
  const { tenantRules, serviceRules, defaults = BOOKING_RULE_DEFAULTS } = input;

  // An inactive service override contributes nothing
  const activeServiceRules =
    serviceRules && serviceRules.isActive ? serviceRules : null;

  // Helper: resolve a single numeric or boolean field with source tracking
  function resolveField<T>(
    serviceValue: T | null | undefined,
    tenantValue: T | undefined,
    defaultValue: T
  ): { value: T; source: BookingRuleSource } {
    if (activeServiceRules && serviceValue !== null && serviceValue !== undefined) {
      return { value: serviceValue, source: "service" };
    }
    if (tenantRules && tenantValue !== null && tenantValue !== undefined) {
      return { value: tenantValue, source: "tenant" };
    }
    return { value: defaultValue, source: "default" };
  }

  const minimumNotice = resolveField(
    activeServiceRules?.minimumNoticeMinutes,
    tenantRules?.minimumNoticeMinutes,
    defaults.minimumNoticeMinutes
  );

  const maximumAdvance = resolveField(
    activeServiceRules?.maximumAdvanceDays,
    tenantRules?.maximumAdvanceDays,
    defaults.maximumAdvanceDays
  );

  const slotInterval = resolveField(
    activeServiceRules?.slotIntervalMinutes,
    tenantRules?.slotIntervalMinutes,
    defaults.slotIntervalMinutes
  );

  const cancellationNotice = resolveField(
    activeServiceRules?.cancellationNoticeMinutes,
    tenantRules?.cancellationNoticeMinutes,
    defaults.cancellationNoticeMinutes
  );

  const rescheduleNotice = resolveField(
    activeServiceRules?.rescheduleNoticeMinutes,
    tenantRules?.rescheduleNoticeMinutes,
    defaults.rescheduleNoticeMinutes
  );

  const allowSameDayBooking = resolveField(
    activeServiceRules?.allowSameDayBooking,
    tenantRules?.allowSameDayBooking,
    defaults.allowSameDayBooking
  );

  const allowCustomerCancellation = resolveField(
    activeServiceRules?.allowCustomerCancellation,
    tenantRules?.allowCustomerCancellation,
    defaults.allowCustomerCancellation
  );

  const allowCustomerRescheduling = resolveField(
    activeServiceRules?.allowCustomerRescheduling,
    tenantRules?.allowCustomerRescheduling,
    defaults.allowCustomerRescheduling
  );

  const requireCustomerPhone = resolveField(
    activeServiceRules?.requireCustomerPhone,
    tenantRules?.requireCustomerPhone,
    defaults.requireCustomerPhone
  );

  const requireCustomerEmail = resolveField(
    activeServiceRules?.requireCustomerEmail,
    tenantRules?.requireCustomerEmail,
    defaults.requireCustomerEmail
  );

  return {
    minimumNoticeMinutes: minimumNotice.value,
    maximumAdvanceDays: maximumAdvance.value,
    slotIntervalMinutes: slotInterval.value,
    cancellationNoticeMinutes: cancellationNotice.value,
    rescheduleNoticeMinutes: rescheduleNotice.value,
    allowSameDayBooking: allowSameDayBooking.value,
    allowCustomerCancellation: allowCustomerCancellation.value,
    allowCustomerRescheduling: allowCustomerRescheduling.value,
    requireCustomerPhone: requireCustomerPhone.value,
    requireCustomerEmail: requireCustomerEmail.value,
    sources: {
      minimumNotice: minimumNotice.source,
      maximumAdvance: maximumAdvance.source,
      slotInterval: slotInterval.source,
      cancellationNotice: cancellationNotice.source,
      rescheduleNotice: rescheduleNotice.source,
      allowSameDayBooking: allowSameDayBooking.source,
      allowCustomerCancellation: allowCustomerCancellation.source,
      allowCustomerRescheduling: allowCustomerRescheduling.source,
      requireCustomerPhone: requireCustomerPhone.source,
      requireCustomerEmail: requireCustomerEmail.source,
    },
  };
}
