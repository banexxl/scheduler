"use server";

/**
 * Booking Modification Actions — Milestone 18.1.
 *
 * Policy-enforced reschedule and cancellation for customer self-service.
 */

import { rescheduleAppointment, cancelAppointment } from "@/features/appointments/services/update-appointment";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import type { BookingPolicies, ModificationPermissions, BookingDetails } from "../types";
import { DEFAULT_BOOKING_POLICIES } from "../types";

// ─── Get Booking Policies ────────────────────────────────────────────────────

export async function getBookingPolicies(
  tenantId: string,
  serviceId: string
): Promise<BookingPolicies> {
  try {
    const rules = await getResolvedBookingRules(tenantId, serviceId);
    return {
      allowCancellation: rules.allowCustomerCancellation,
      allowReschedule: rules.allowCustomerRescheduling,
      cancellationNoticeMinutes: rules.cancellationNoticeMinutes,
      rescheduleNoticeMinutes: rules.rescheduleNoticeMinutes,
      maxRescheduleDays: rules.maximumAdvanceDays,
    };
  } catch {
    return DEFAULT_BOOKING_POLICIES;
  }
}

// ─── Can Modify Booking ──────────────────────────────────────────────────────

/**
 * Determines what actions a customer can take on their booking.
 * Returns permissions with human-readable reasons when disabled.
 */
export async function canModifyBooking(
  booking: BookingDetails
): Promise<ModificationPermissions> {
  const policies = await getBookingPolicies(booking.tenantId, booking.service.id);
  const now = new Date();
  const startsAt = new Date(booking.startsAt);
  const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60000;

  let canCancel = true;
  let canReschedule = true;
  let cancelReason: string | null = null;
  let rescheduleReason: string | null = null;

  // Terminal statuses — no actions
  if (["completed", "cancelled", "no_show"].includes(booking.status)) {
    return {
      canCancel: false,
      canReschedule: false,
      cancelReason: booking.status === "cancelled" ? "This booking has already been cancelled." : "This booking is no longer active.",
      rescheduleReason: booking.status === "cancelled" ? "This booking has already been cancelled." : "This booking is no longer active.",
    };
  }

  // Past appointments
  if (minutesUntilStart <= 0) {
    return {
      canCancel: false,
      canReschedule: false,
      cancelReason: "This appointment has already started or passed.",
      rescheduleReason: "This appointment has already started or passed.",
    };
  }

  // Policy: cancellation disabled
  if (!policies.allowCancellation) {
    canCancel = false;
    cancelReason = "Cancellations are not available for this service.";
  }

  // Policy: reschedule disabled
  if (!policies.allowReschedule) {
    canReschedule = false;
    rescheduleReason = "Rescheduling is not available for this service.";
  }

  // Policy: cancellation notice period
  if (canCancel && policies.cancellationNoticeMinutes > 0 && minutesUntilStart < policies.cancellationNoticeMinutes) {
    canCancel = false;
    const hours = Math.ceil(policies.cancellationNoticeMinutes / 60);
    cancelReason = `Cancellations require at least ${hours} hour${hours > 1 ? "s" : ""} notice.`;
  }

  // Policy: reschedule notice period
  if (canReschedule && policies.rescheduleNoticeMinutes > 0 && minutesUntilStart < policies.rescheduleNoticeMinutes) {
    canReschedule = false;
    const hours = Math.ceil(policies.rescheduleNoticeMinutes / 60);
    rescheduleReason = `Rescheduling requires at least ${hours} hour${hours > 1 ? "s" : ""} notice.`;
  }

  return { canCancel, canReschedule, cancelReason, rescheduleReason };
}

// ─── Cancel Booking ──────────────────────────────────────────────────────────

export type CancelResult =
  | { success: true }
  | { success: false; error: string };

export async function cancelBookingAction(
  booking: BookingDetails,
  reason: string
): Promise<CancelResult> {
  // Re-check permissions
  const perms = await canModifyBooking(booking);
  if (!perms.canCancel) {
    return { success: false, error: perms.cancelReason ?? "Cancellation is not allowed." };
  }

  const result = await cancelAppointment({
    tenantId: booking.tenantId,
    appointmentId: booking.id,
    reason: reason.trim() || null,
    cancelledBy: null, // Customer — no auth user
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

// ─── Reschedule Booking ──────────────────────────────────────────────────────

export type RescheduleResult =
  | { success: true }
  | { success: false; error: string };

export async function rescheduleBookingAction(
  booking: BookingDetails,
  localDate: string,
  localStartTime: string
): Promise<RescheduleResult> {
  // Re-check permissions
  const perms = await canModifyBooking(booking);
  if (!perms.canReschedule) {
    return { success: false, error: perms.rescheduleReason ?? "Rescheduling is not allowed." };
  }

  const result = await rescheduleAppointment({
    tenantId: booking.tenantId,
    appointmentId: booking.id,
    localDate,
    localStartTime,
    updatedBy: null,
  });

  if (!result.success) {
    const isConflict = result.code === "APPOINTMENT_CONFLICT" || result.code === "SLOT_NO_LONGER_AVAILABLE";
    if (isConflict) {
      return { success: false, error: "That time was just booked. Please choose another." };
    }
    return { success: false, error: result.error };
  }

  return { success: true };
}
