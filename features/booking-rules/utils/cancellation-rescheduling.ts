/**
 * Pure cancellation and rescheduling eligibility helpers — Milestone 6.8.
 *
 * These helpers determine whether a customer may cancel or reschedule
 * an appointment based on resolved booking rules.
 *
 * Semantics:
 *   allowed flag must be true
 *   AND appointment start - now >= notice window
 *
 * These are unit-tested but NOT wired to appointment actions (which do not
 * exist yet). They are prepared for future appointment workflows.
 *
 * Requirements:
 * - Pure (no database access)
 * - Deterministic (no hidden current time)
 * - No input mutation
 */

import type { ResolvedBookingRules } from "../types/booking-rules";

// ─── Result Types ────────────────────────────────────────────────────────────

export type CancellationEligibility = {
  allowed: boolean;
  reason: CancellationDenialReason | null;
};

export type CancellationDenialReason =
  | "CANCELLATION_NOT_ALLOWED"
  | "INSUFFICIENT_NOTICE";

export type ReschedulingEligibility = {
  allowed: boolean;
  reason: ReschedulingDenialReason | null;
};

export type ReschedulingDenialReason =
  | "RESCHEDULING_NOT_ALLOWED"
  | "INSUFFICIENT_NOTICE";

// ─── Cancellation Helper ─────────────────────────────────────────────────────

/**
 * Determines whether a customer may cancel an appointment.
 *
 * @param rules - Resolved booking rules
 * @param appointmentStartsAt - Appointment service start instant (ISO string or Date)
 * @param now - Current instant
 */
export function canCustomerCancelAppointment(
  rules: ResolvedBookingRules,
  appointmentStartsAt: Date | string,
  now: Date
): CancellationEligibility {
  // Check if cancellation is allowed at all
  if (!rules.allowCustomerCancellation) {
    return { allowed: false, reason: "CANCELLATION_NOT_ALLOWED" };
  }

  // Check notice window
  const startMs = typeof appointmentStartsAt === "string"
    ? new Date(appointmentStartsAt).getTime()
    : appointmentStartsAt.getTime();
  const nowMs = now.getTime();

  const remainingMinutes = (startMs - nowMs) / 60_000;
  if (remainingMinutes < rules.cancellationNoticeMinutes) {
    return { allowed: false, reason: "INSUFFICIENT_NOTICE" };
  }

  return { allowed: true, reason: null };
}

// ─── Rescheduling Helper ─────────────────────────────────────────────────────

/**
 * Determines whether a customer may reschedule an appointment.
 *
 * @param rules - Resolved booking rules
 * @param appointmentStartsAt - Appointment service start instant (ISO string or Date)
 * @param now - Current instant
 */
export function canCustomerRescheduleAppointment(
  rules: ResolvedBookingRules,
  appointmentStartsAt: Date | string,
  now: Date
): ReschedulingEligibility {
  // Check if rescheduling is allowed at all
  if (!rules.allowCustomerRescheduling) {
    return { allowed: false, reason: "RESCHEDULING_NOT_ALLOWED" };
  }

  // Check notice window
  const startMs = typeof appointmentStartsAt === "string"
    ? new Date(appointmentStartsAt).getTime()
    : appointmentStartsAt.getTime();
  const nowMs = now.getTime();

  const remainingMinutes = (startMs - nowMs) / 60_000;
  if (remainingMinutes < rules.rescheduleNoticeMinutes) {
    return { allowed: false, reason: "INSUFFICIENT_NOTICE" };
  }

  return { allowed: true, reason: null };
}
