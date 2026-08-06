/**
 * Domain types for location schedule exceptions.
 *
 * Exceptions replace normal business hours for a specific date.
 * - "closed": no operating periods for that date.
 * - "custom_hours": custom opening periods replace the weekly schedule.
 */

// ─── Exception Types ─────────────────────────────────────────────────────────

export const EXCEPTION_TYPES = ["closed", "custom_hours"] as const;
export type LocationScheduleExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_TYPE_LABELS: Record<LocationScheduleExceptionType, string> = {
  closed: "Closed",
  custom_hours: "Custom Hours",
};

// ─── Core Row Type ───────────────────────────────────────────────────────────

export type LocationScheduleException = {
  id: string;
  tenantId: string;
  locationId: string;
  exceptionDate: string; // "YYYY-MM-DD"
  exceptionType: LocationScheduleExceptionType;
  title: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Exception Period ────────────────────────────────────────────────────────

export type LocationExceptionPeriod = {
  id: string;
  tenantId: string;
  exceptionId: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Joined Type ─────────────────────────────────────────────────────────────

export type LocationExceptionWithPeriods = LocationScheduleException & {
  periods: LocationExceptionPeriod[];
};

// ─── Input Types ─────────────────────────────────────────────────────────────

export type LocationExceptionPeriodInput = {
  startTime: string;
  endTime: string;
  sortOrder?: number;
};

export type LocationScheduleExceptionInput = {
  locationId: string;
  exceptionDate: string;
  exceptionType: LocationScheduleExceptionType;
  title?: string | null;
  notes?: string | null;
  isActive?: boolean;
  periods: LocationExceptionPeriodInput[];
};

// ─── Resolution Output ───────────────────────────────────────────────────────

export type ResolvedLocationOperatingPeriods = {
  date: string; // "YYYY-MM-DD"
  source: "weekly" | "closed_exception" | "custom_exception";
  periods: { startTime: string; endTime: string }[];
};

// ─── Validation Constants ────────────────────────────────────────────────────

export const EXCEPTION_TITLE_MAX = 120;
export const EXCEPTION_NOTES_MAX = 2000;
