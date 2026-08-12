/**
 * Recurring Appointment Types — Milestone 15.1.
 */

// ─── Recurrence Rule ─────────────────────────────────────────────────────────

export type RecurrenceType = "daily" | "weekly" | "monthly";

export type RecurrenceRule = {
  type: RecurrenceType;
  interval: number; // every N days/weeks/months (1–12)
  daysOfWeek?: number[]; // 0=Sunday...6=Saturday (for weekly)
  dayOfMonth?: number; // 1–31 (for monthly)
  startsOn: string; // YYYY-MM-DD
  endsOn?: string; // YYYY-MM-DD (mutually exclusive with count)
  occurrenceCount?: number; // max occurrences (mutually exclusive with endsOn)
  startsAtLocalTime: string; // HH:mm
  timezone: string;
};

// ─── Generated Occurrence ────────────────────────────────────────────────────

export type GeneratedOccurrence = {
  index: number; // 1-based
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm
  startsAtUtc: string; // ISO 8601 UTC
  endsAtUtc: string; // ISO 8601 UTC
};

// ─── Series Status ───────────────────────────────────────────────────────────

export type SeriesStatus = "active" | "completed" | "cancelled";

// ─── Series DTO ──────────────────────────────────────────────────────────────

export type AppointmentSeriesDTO = {
  id: string;
  tenantId: string;
  customerName: string;
  serviceName: string;
  locationName: string;
  resourceName: string | null;
  recurrenceSummary: string;
  nextOccurrenceAt: string | null;
  totalOccurrences: number;
  completedOccurrences: number;
  remainingOccurrences: number;
  status: SeriesStatus;
  startsOn: string;
  endsOn: string | null;
  startsAtLocalTime: string;
  timezone: string;
};

// ─── Edit Scope ──────────────────────────────────────────────────────────────

export type EditScope = "this_only" | "this_and_future";

// ─── Cancel Scope ────────────────────────────────────────────────────────────

export type CancelScope = "this_only" | "this_and_future";

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_SERIES_OCCURRENCES = 52;
export const MAX_RECURRENCE_INTERVAL = 12;
