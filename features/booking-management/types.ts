/**
 * Booking Management Types — Milestones 18.0 + 18.1.
 *
 * Types for the customer self-service booking portal.
 */

import type { AppointmentStatus } from "@/features/appointments/types/appointment";

export type { AppointmentStatus };

// ─── Booking Details ─────────────────────────────────────────────────────────

export type BookingDetails = {
  id: string;
  reference: string;
  status: AppointmentStatus;

  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };

  service: {
    id: string;
    name: string;
  };

  staff: {
    name: string;
  } | null;

  location: {
    id: string;
    name: string;
  };

  resourceId: string;
  tenantId: string;

  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  price: string;
  currency: string;

  notes: string | null;
  tenantName: string;

  // Timeline timestamps
  createdAt: string;
  confirmedAt: string | null;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  noShowAt: string | null;
};

// ─── Booking Policies (Milestone 18.1) ───────────────────────────────────────

export type BookingPolicies = {
  allowCancellation: boolean;
  allowReschedule: boolean;
  cancellationNoticeMinutes: number;
  rescheduleNoticeMinutes: number;
  maxRescheduleDays: number;
};

export const DEFAULT_BOOKING_POLICIES: BookingPolicies = {
  allowCancellation: true,
  allowReschedule: true,
  cancellationNoticeMinutes: 1440, // 24 hours
  rescheduleNoticeMinutes: 1440,
  maxRescheduleDays: 90,
};

// ─── Modification Permissions ────────────────────────────────────────────────

export type ModificationPermissions = {
  canCancel: boolean;
  canReschedule: boolean;
  cancelReason: string | null;
  rescheduleReason: string | null;
};

// ─── Status Timeline Entry ───────────────────────────────────────────────────

export type TimelineEntry = {
  status: string;
  label: string;
  timestamp: string | null;
  active: boolean;
  completed: boolean;
};

// ─── Lookup Form Values ──────────────────────────────────────────────────────

export type LookupFormValues = {
  reference: string;
  email: string;
};
