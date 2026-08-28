/**
 * Booking Management Types — Milestone 18.0.
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
    name: string;
  };

  staff: {
    name: string;
  } | null;

  location: {
    name: string;
  };

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
