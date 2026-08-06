/**
 * Pure slot-filtering utility — Milestone 6.8.
 *
 * Filters candidate availability slots by booking rules:
 * - Past time (slot starts before `now`)
 * - Same-day booking disabled
 * - Minimum notice not met
 * - Maximum advance exceeded
 *
 * Requirements:
 * - Deterministic (no hidden current time)
 * - No database access
 * - Tenant-time-zone aware
 * - No input mutation
 * - Stable ordering (preserves input order)
 * - Testable independently
 */

import type { AvailabilitySlot } from "@/features/availability/types/availability";
import type { ResolvedBookingRules, BookingRuleReasonCode, SlotFilterResult } from "../types/booking-rules";
import { getTenantLocalDate } from "@/lib/scheduling/zoned-local-time";

// ─── Input Type ──────────────────────────────────────────────────────────────

export type FilterSlotsByBookingRulesInput = {
  /** Candidate slots from the availability engine */
  slots: AvailabilitySlot[];
  /** Fully resolved booking rules */
  rules: ResolvedBookingRules;
  /** Current instant (injected for testability) */
  now: Date;
  /** Tenant IANA time zone */
  tenantTimeZone: string;
  /** The local date being requested (YYYY-MM-DD) */
  requestedLocalDate: string;
};

// ─── Filter Function ─────────────────────────────────────────────────────────

/**
 * Filters candidate slots by booking policy rules.
 *
 * Applied in this order per slot:
 * 1. Past time — slot.startsAt < now
 * 2. Same-day disabled — requested date is tenant's current local date
 * 3. Minimum notice — slot.startsAt < now + minimumNoticeMinutes
 * 4. Maximum advance — requested date > current local date + maximumAdvanceDays
 *
 * Returns the remaining permitted slots and counts of removed slots per reason.
 * When all slots are removed, returns the most relevant reason code.
 */
export function filterSlotsByBookingRules(
  input: FilterSlotsByBookingRulesInput
): SlotFilterResult {
  const { slots, rules, now, tenantTimeZone, requestedLocalDate } = input;

  const removedCounts = {
    past: 0,
    sameDayDisabled: 0,
    minimumNotice: 0,
    maximumAdvance: 0,
  };

  // Pre-compute thresholds
  const nowMs = now.getTime();
  const tenantLocalDateToday = getTenantLocalDate(now, tenantTimeZone);

  // Same-day check: is the requested date the tenant's current local date?
  const isSameDay = requestedLocalDate === tenantLocalDateToday;

  // Maximum advance: compute the latest allowed local date
  // latest allowed = current tenant local date + maximumAdvanceDays
  const latestAllowedDate = addDaysToLocalDate(tenantLocalDateToday, rules.maximumAdvanceDays);
  const isMaxAdvanceExceeded = requestedLocalDate > latestAllowedDate;

  // Minimum notice threshold: now + minimumNoticeMinutes (as milliseconds)
  const minimumNoticeThresholdMs = nowMs + rules.minimumNoticeMinutes * 60_000;

  // If maximum advance is exceeded, ALL slots on this date are invalid
  if (isMaxAdvanceExceeded) {
    removedCounts.maximumAdvance = slots.length;
    return {
      slots: [],
      removedCounts,
      reasonCode: "MAXIMUM_ADVANCE_EXCEEDED",
    };
  }

  // If same-day booking is disabled and this is today, ALL slots are invalid
  if (!rules.allowSameDayBooking && isSameDay) {
    removedCounts.sameDayDisabled = slots.length;
    return {
      slots: [],
      removedCounts,
      reasonCode: "SAME_DAY_BOOKING_DISABLED",
    };
  }

  // Filter individual slots
  const permitted: AvailabilitySlot[] = [];

  for (const slot of slots) {
    const slotStartMs = new Date(slot.startsAt).getTime();

    // 1. Past time
    if (slotStartMs < nowMs) {
      removedCounts.past++;
      continue;
    }

    // 2. Minimum notice
    if (slotStartMs < minimumNoticeThresholdMs) {
      removedCounts.minimumNotice++;
      continue;
    }

    // Slot passes all booking rule checks
    permitted.push(slot);
  }

  // Determine reason code when all slots removed
  let reasonCode: BookingRuleReasonCode | undefined;
  if (permitted.length === 0 && slots.length > 0) {
    // Use deterministic precedence for reason code
    reasonCode = determineReasonCode(removedCounts);
  }

  return {
    slots: permitted,
    removedCounts,
    reasonCode,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determines the most relevant reason code based on removal counts.
 *
 * Precedence (highest to lowest):
 * 1. Same-day disabled
 * 2. Maximum advance exceeded
 * 3. Minimum notice removes all slots
 * 4. All slots in the past
 */
function determineReasonCode(
  removedCounts: SlotFilterResult["removedCounts"]
): BookingRuleReasonCode | undefined {
  if (removedCounts.sameDayDisabled > 0) return "SAME_DAY_BOOKING_DISABLED";
  if (removedCounts.maximumAdvance > 0) return "MAXIMUM_ADVANCE_EXCEEDED";
  if (removedCounts.minimumNotice > 0) return "MINIMUM_NOTICE_NOT_MET";
  // past slots are already handled by the availability engine's DATE_IN_PAST,
  // but if somehow only past-time filtering removed slots here, no booking-rule
  // reason code applies (it's a time-of-day issue, not a policy issue)
  return undefined;
}

/**
 * Adds days to a local date string (YYYY-MM-DD) and returns the resulting date string.
 * Uses UTC date arithmetic to avoid timezone issues in the calculation itself.
 */
function addDaysToLocalDate(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
