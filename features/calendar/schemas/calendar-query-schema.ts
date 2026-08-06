/**
 * Validation schema for calendar query parameters — Milestone 6.10.
 *
 * Validates URL search parameters for the calendar route:
 * - view: "day" or "week" (default: "day")
 * - date: valid YYYY-MM-DD calendar date (default: tenant-local today)
 * - location: valid UUID or null
 * - resource: valid UUID or null
 * - status: valid appointment status or null
 *
 * Invalid values are normalized to safe defaults rather than throwing errors.
 */

import { APPOINTMENT_STATUSES } from "@/features/appointments/types/appointment";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";
import type { CalendarView, CalendarFilters } from "../types/calendar";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number) as [number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidView(value: string): value is CalendarView {
  return value === "day" || value === "week";
}

function isValidStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Parses and validates calendar URL search parameters.
 * Returns safe defaults for any invalid or missing values.
 *
 * @param params - Raw URL search params
 * @param tenantToday - Today's date in tenant timezone (fallback for invalid/missing date)
 */
export function parseCalendarFilters(
  params: Record<string, string | undefined>,
  tenantToday: string
): CalendarFilters {
  // View
  const rawView = params.view ?? "";
  const view: CalendarView = isValidView(rawView) ? rawView : "day";

  // Date
  const rawDate = params.date ?? "";
  const date = rawDate && isValidCalendarDate(rawDate) ? rawDate : tenantToday;

  // Location
  const rawLocation = params.location ?? "";
  const locationId = rawLocation && isValidUuid(rawLocation) ? rawLocation : null;

  // Resource
  const rawResource = params.resource ?? "";
  const resourceId = rawResource && isValidUuid(rawResource) ? rawResource : null;

  // Status
  const rawStatus = params.status ?? "";
  const status = rawStatus && isValidStatus(rawStatus) ? rawStatus : null;

  return { view, date, locationId, resourceId, status };
}
