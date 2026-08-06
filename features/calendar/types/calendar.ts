/**
 * Calendar domain types — Milestone 6.10.
 *
 * Lightweight projection types for the internal appointment calendar.
 * These are smaller than full Appointment types and optimized for
 * rendering calendar blocks.
 */

import type { AppointmentStatus } from "@/features/appointments/types/appointment";

// ─── Calendar Appointment Projection ─────────────────────────────────────────

export type CalendarAppointment = {
  id: string;
  appointmentNumber: string;
  status: AppointmentStatus;

  startsAt: string;
  endsAt: string;
  occupiedStartsAt: string;
  occupiedEndsAt: string;

  customerName: string;
  serviceName: string;
  resourceName: string;
  locationName: string;

  serviceId: string;
  resourceId: string;
  locationId: string;

  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;

  price: string;
  currency: string;
};

// ─── Calendar View Types ─────────────────────────────────────────────────────

export type CalendarView = "day" | "week";

export const CALENDAR_VIEWS: CalendarView[] = ["day", "week"];

// ─── Calendar Query Input ────────────────────────────────────────────────────

export type CalendarAppointmentQuery = {
  tenantId: string;
  /** ISO instant: query appointments that start before this */
  startsBefore: string;
  /** ISO instant: query appointments that end after this */
  endsAfter: string;
  locationId?: string | null;
  resourceId?: string | null;
  statuses?: AppointmentStatus[];
};

// ─── Calendar Filters (from URL) ─────────────────────────────────────────────

export type CalendarFilters = {
  view: CalendarView;
  date: string;
  locationId: string | null;
  resourceId: string | null;
  status: AppointmentStatus | null;
};

// ─── Calendar Page Data ──────────────────────────────────────────────────────

export type CalendarPageData = {
  appointments: CalendarAppointment[];
  timeZone: string;
  localDate: string;
  view: CalendarView;
  filters: CalendarFilters;
};
