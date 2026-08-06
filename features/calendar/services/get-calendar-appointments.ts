import "server-only";

/**
 * Calendar query service — Milestone 6.10.
 *
 * Provides optimized appointment queries for the calendar view using
 * overlap semantics: starts_at < rangeEnd AND ends_at > rangeStart.
 *
 * Returns the lightweight CalendarAppointment projection with snapshot
 * labels for display. Tenant-scoped via RLS.
 */

import { createClient } from "@/lib/supabase/server";
import type { CalendarAppointment, CalendarAppointmentQuery } from "../types/calendar";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapCalendarRow(row: Record<string, unknown>): CalendarAppointment {
  return {
    id: row.id as string,
    appointmentNumber: row.appointment_number as string,
    status: row.status as AppointmentStatus,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    occupiedStartsAt: row.occupied_starts_at as string,
    occupiedEndsAt: row.occupied_ends_at as string,
    customerName: row.customer_name as string,
    serviceName: row.service_name_snapshot as string,
    resourceName: row.resource_name_snapshot as string,
    locationName: row.location_name_snapshot as string,
    serviceId: row.service_id as string,
    resourceId: row.resource_id as string,
    locationId: row.location_id as string,
    durationMinutes: row.duration_minutes as number,
    bufferBeforeMinutes: row.buffer_before_minutes as number,
    bufferAfterMinutes: row.buffer_after_minutes as number,
    price: String(row.price),
    currency: row.currency as string,
  };
}

// ─── Calendar Select Columns ─────────────────────────────────────────────────

const CALENDAR_COLUMNS = [
  "id",
  "appointment_number",
  "status",
  "starts_at",
  "ends_at",
  "occupied_starts_at",
  "occupied_ends_at",
  "customer_name",
  "service_name_snapshot",
  "resource_name_snapshot",
  "location_name_snapshot",
  "service_id",
  "resource_id",
  "location_id",
  "duration_minutes",
  "buffer_before_minutes",
  "buffer_after_minutes",
  "price",
  "currency",
].join(", ");

// ─── Main Query ──────────────────────────────────────────────────────────────

/**
 * Fetches appointments for a calendar range using overlap semantics.
 *
 * Overlap: starts_at < rangeEnd AND ends_at > rangeStart
 *
 * This ensures appointments that partially overlap the visible range
 * are included (e.g., an appointment starting before midnight but
 * ending within the visible day).
 *
 * Default behavior: excludes cancelled unless explicitly requested.
 */
export async function getCalendarAppointments(
  query: CalendarAppointmentQuery
): Promise<CalendarAppointment[]> {
  const { tenantId, startsBefore, endsAfter, locationId, resourceId, statuses } = query;

  const supabase = await createClient();

  let dbQuery = supabase
    .from("appointments")
    .select(CALENDAR_COLUMNS)
    .eq("tenant_id", tenantId)
    .lt("starts_at", startsBefore)
    .gt("ends_at", endsAfter);

  // Filter by location
  if (locationId) {
    dbQuery = dbQuery.eq("location_id", locationId);
  }

  // Filter by resource
  if (resourceId) {
    dbQuery = dbQuery.eq("resource_id", resourceId);
  }

  // Filter by statuses
  if (statuses && statuses.length > 0) {
    dbQuery = dbQuery.in("status", statuses);
  } else {
    // Default: exclude cancelled
    dbQuery = dbQuery.neq("status", "cancelled");
  }

  const { data, error } = await dbQuery
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map(mapCalendarRow);
}

// ─── Helper: Get appointments for a single day ───────────────────────────────

/**
 * Convenience wrapper for fetching a single day's appointments.
 */
export async function getCalendarDayAppointments(
  tenantId: string,
  dayRangeStart: string,
  dayRangeEnd: string,
  options?: {
    locationId?: string | null;
    resourceId?: string | null;
    statuses?: AppointmentStatus[];
  }
): Promise<CalendarAppointment[]> {
  return getCalendarAppointments({
    tenantId,
    startsBefore: dayRangeEnd,
    endsAfter: dayRangeStart,
    locationId: options?.locationId,
    resourceId: options?.resourceId,
    statuses: options?.statuses,
  });
}

// ─── Helper: Get appointments for a week ─────────────────────────────────────

/**
 * Convenience wrapper for fetching a full week's appointments.
 */
export async function getCalendarWeekAppointments(
  tenantId: string,
  weekRangeStart: string,
  weekRangeEnd: string,
  options?: {
    locationId?: string | null;
    resourceId?: string | null;
    statuses?: AppointmentStatus[];
  }
): Promise<CalendarAppointment[]> {
  return getCalendarAppointments({
    tenantId,
    startsBefore: weekRangeEnd,
    endsAfter: weekRangeStart,
    locationId: options?.locationId,
    resourceId: options?.resourceId,
    statuses: options?.statuses,
  });
}
