/**
 * Email Module Types — Milestone 18.2.
 *
 * Types for branded transactional booking emails.
 */

// ─── Booking Email Data ──────────────────────────────────────────────────────

export type BookingEmailData = {
  tenant: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
  };

  booking: {
    reference: string;
    startsAt: string;
    endsAt: string;
    localDate: string;
    localStartTime: string;
    localEndTime: string;
    serviceName: string;
    staffName: string | null;
    locationName: string;
    durationMinutes: number;
    price: string;
    currency: string;
    timeZone: string;
  };

  customer: {
    name: string;
    email: string;
  };

  manageUrl: string;
};

// ─── Reschedule Email Data ───────────────────────────────────────────────────

export type RescheduleEmailData = BookingEmailData & {
  previousStartsAt: string;
  previousLocalDate: string;
  previousLocalStartTime: string;
};

// ─── Cancellation Email Data ─────────────────────────────────────────────────

export type CancellationEmailData = BookingEmailData & {
  cancellationReason: string | null;
};

// ─── Email Event Type ────────────────────────────────────────────────────────

export type BookingEmailEvent =
  | "booking_confirmed"
  | "booking_rescheduled"
  | "booking_cancelled"
  | "booking_reminder";
