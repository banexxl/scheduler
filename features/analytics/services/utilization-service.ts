import "server-only";

/**
 * Resource Utilization Analytics Service — Milestone 15.9.1.
 *
 * Calculates real utilization for resources based on:
 * - resource_working_hours (per day_of_week, per location)
 * - location_working_hours (intersection)
 * - resource_time_off (subtraction with overlap merging)
 * - appointments.duration_minutes (booked, excluding cancelled)
 *
 * Formula:
 *   utilization = booked_eligible_minutes / available_eligible_minutes
 *
 * Booked eligible minutes:
 *   SUM(duration_minutes) for appointments WHERE status != 'cancelled'
 *   (no-show time counts as booked — resource was occupied)
 *
 * Available eligible minutes:
 *   SUM(resource working hours per day in range)
 *   intersected with location operating hours
 *   minus resource time-off (with overlap merging)
 *
 * Non-human resources are fully supported.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { toZonedTime } from "date-fns-tz";
import { format, addDays } from "date-fns";
import type { StaffPerformanceItem } from "../types/advanced-analytics";

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkingHourRow = {
  resource_id: string;
  location_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type LocationHourRow = {
  location_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type TimeOffRow = {
  resource_id: string;
  location_id: string | null;
  starts_at: string;
  ends_at: string;
};

type TimeInterval = { start: number; end: number }; // minutes from midnight

// ─── Utilization Calculation ─────────────────────────────────────────────────

/**
 * Calculates utilization for all active resources in a tenant for the given date range.
 */
export async function getResourceUtilizationAnalytics(
  tenantId: string,
  timeZone: string,
  rangeStart: string,
  rangeEnd: string,
  filters?: { locationId?: string | null; resourceId?: string | null }
): Promise<StaffPerformanceItem[]> {
  const supabase = createServiceRoleClient();

  // 1. Load all active resources
  let resourceQuery = supabase
    .from("resources")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (filters?.resourceId) {
    resourceQuery = resourceQuery.eq("id", filters.resourceId);
  }

  const { data: resources } = await resourceQuery.limit(50);
  if (!resources || resources.length === 0) return [];

  const resourceIds = resources.map((r) => r.id);

  // 2. Load resource working hours
  const { data: workingHoursRaw } = await supabase
    .from("resource_working_hours")
    .select("resource_id, location_id, day_of_week, start_time, end_time")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("resource_id", resourceIds);

  const workingHours = (workingHoursRaw ?? []) as WorkingHourRow[];

  // 3. Load location working hours
  const { data: locationHoursRaw } = await supabase
    .from("location_working_hours" as never)
    .select("location_id, day_of_week, opens_at, closes_at, is_closed" as never);

  const locationHours = (locationHoursRaw ?? []) as unknown as LocationHourRow[];

  // 4. Load resource time off (overlapping with range)
  const { data: timeOffRaw } = await supabase
    .from("resource_time_off" as never)
    .select("resource_id, location_id, starts_at, ends_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("is_active" as never, true)
    .lte("starts_at" as never, rangeEnd)
    .gte("ends_at" as never, rangeStart)
    .in("resource_id" as never, resourceIds);

  const timeOff = (timeOffRaw ?? []) as unknown as TimeOffRow[];

  // 5. Load booked minutes per resource (status != 'cancelled')
  const { data: bookedRaw } = await supabase
    .from("appointments")
    .select("resource_id, duration_minutes")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("starts_at", rangeStart)
    .lt("starts_at", rangeEnd)
    .in("resource_id", resourceIds);

  const bookedByResource = new Map<string, number>();
  for (const row of (bookedRaw ?? []) as Array<{ resource_id: string; duration_minutes: number }>) {
    bookedByResource.set(row.resource_id, (bookedByResource.get(row.resource_id) ?? 0) + row.duration_minutes);
  }

  // 6. Load appointment counts per resource
  const { data: countsRaw } = await supabase
    .from("appointments")
    .select("resource_id, status")
    .eq("tenant_id", tenantId)
    .gte("starts_at", rangeStart)
    .lt("starts_at", rangeEnd)
    .in("resource_id", resourceIds);

  const countsByResource = new Map<string, { total: number; completed: number; cancelled: number; noShows: number }>();
  for (const row of (countsRaw ?? []) as Array<{ resource_id: string; status: string }>) {
    const existing = countsByResource.get(row.resource_id) ?? { total: 0, completed: 0, cancelled: 0, noShows: 0 };
    existing.total++;
    if (row.status === "completed") existing.completed++;
    if (row.status === "cancelled") existing.cancelled++;
    if (row.status === "no_show") existing.noShows++;
    countsByResource.set(row.resource_id, existing);
  }

  // 7. Load unique customers per resource
  const { data: uniqueCustomersRaw } = await supabase
    .from("appointments")
    .select("resource_id, customer_id")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("starts_at", rangeStart)
    .lt("starts_at", rangeEnd)
    .in("resource_id", resourceIds);

  const uniqueCustomersByResource = new Map<string, Set<string>>();
  for (const row of (uniqueCustomersRaw ?? []) as Array<{ resource_id: string; customer_id: string | null }>) {
    if (!row.customer_id) continue;
    const set = uniqueCustomersByResource.get(row.resource_id) ?? new Set();
    set.add(row.customer_id);
    uniqueCustomersByResource.set(row.resource_id, set);
  }

  // 8. Calculate available minutes per resource
  const results: StaffPerformanceItem[] = [];

  for (const resource of resources as Array<{ id: string; name: string }>) {
    const availableMinutes = calculateAvailableMinutes(
      resource.id,
      workingHours,
      locationHours,
      timeOff,
      rangeStart,
      rangeEnd,
      timeZone,
      filters?.locationId ?? null
    );

    const bookedMinutes = bookedByResource.get(resource.id) ?? 0;
    const counts = countsByResource.get(resource.id) ?? { total: 0, completed: 0, cancelled: 0, noShows: 0 };
    const uniqueCustomers = uniqueCustomersByResource.get(resource.id)?.size ?? 0;

    const utilization = availableMinutes > 0
      ? Math.min(1, Math.round((bookedMinutes / availableMinutes) * 1000) / 1000)
      : null;

    results.push({
      resourceId: resource.id,
      resourceName: resource.name,
      totalAppointments: counts.total,
      completedAppointments: counts.completed,
      cancelledAppointments: counts.cancelled,
      noShows: counts.noShows,
      bookedMinutes,
      availableMinutes: availableMinutes > 0 ? availableMinutes : null,
      utilization,
      uniqueCustomers,
      collectedByCurrency: [], // Financial attribution handled separately
    });
  }

  // Sort by utilization descending (null last)
  results.sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1));

  return results;
}

// ─── Available Minutes Calculation ───────────────────────────────────────────

/**
 * Calculates total available minutes for a resource across a date range.
 *
 * For each day in the range:
 * 1. Get resource working hours for that day_of_week
 * 2. Intersect with location operating hours (if location filter)
 * 3. Subtract time-off overlapping that day
 * 4. Sum remaining minutes
 */
function calculateAvailableMinutes(
  resourceId: string,
  workingHours: WorkingHourRow[],
  locationHours: LocationHourRow[],
  timeOff: TimeOffRow[],
  rangeStart: string,
  rangeEnd: string,
  timeZone: string,
  locationFilter: string | null
): number {
  let totalMinutes = 0;

  // Iterate each day in range
  const startDate = toZonedTime(new Date(rangeStart), timeZone);
  const endDate = toZonedTime(new Date(rangeEnd), timeZone);
  let current = startDate;

  // Limit to 366 days max for safety
  let dayCount = 0;
  const maxDays = 366;

  while (current < endDate && dayCount < maxDays) {
    dayCount++;
    const isoWeekday = getIsoWeekday(current);
    const dateStr = format(current, "yyyy-MM-dd");

    // Get resource working periods for this day
    const resourcePeriods = getResourcePeriodsForDay(resourceId, isoWeekday, workingHours, locationFilter);

    if (resourcePeriods.length > 0) {
      // Intersect with location hours if applicable
      let effectivePeriods = resourcePeriods;
      if (locationFilter) {
        const locPeriods = getLocationPeriodsForDay(locationFilter, isoWeekday, locationHours);
        if (locPeriods.length > 0) {
          effectivePeriods = intersectIntervals(resourcePeriods, locPeriods);
        } else {
          // Location is closed — no available time
          effectivePeriods = [];
        }
      }

      if (effectivePeriods.length > 0) {
        // Subtract time-off for this day
        const dayTimeOff = getTimeOffIntervalsForDay(resourceId, dateStr, timeOff, timeZone, locationFilter);
        const merged = mergeOverlappingIntervals(dayTimeOff);
        const afterTimeOff = subtractIntervals(effectivePeriods, merged);

        // Sum remaining minutes
        for (const interval of afterTimeOff) {
          totalMinutes += interval.end - interval.start;
        }
      }
    }

    current = addDays(current, 1);
  }

  return totalMinutes;
}

// ─── Interval Math ───────────────────────────────────────────────────────────

/**
 * Returns resource working periods as minutes-from-midnight intervals for a given day.
 */
function getResourcePeriodsForDay(
  resourceId: string,
  isoWeekday: number,
  workingHours: WorkingHourRow[],
  locationFilter: string | null
): TimeInterval[] {
  const applicable = workingHours.filter((h) =>
    h.resource_id === resourceId &&
    h.day_of_week === isoWeekday &&
    (locationFilter === null || h.location_id === locationFilter || h.location_id === null)
  );

  return applicable.map((h) => ({
    start: timeToMinutes(h.start_time),
    end: timeToMinutes(h.end_time),
  })).filter((i) => i.end > i.start);
}

/**
 * Returns location operating periods as minutes-from-midnight intervals.
 */
function getLocationPeriodsForDay(
  locationId: string,
  isoWeekday: number,
  locationHours: LocationHourRow[]
): TimeInterval[] {
  const entry = locationHours.find(
    (h) => h.location_id === locationId && h.day_of_week === isoWeekday
  );

  if (!entry || entry.is_closed || !entry.opens_at || !entry.closes_at) return [];

  return [{ start: timeToMinutes(entry.opens_at), end: timeToMinutes(entry.closes_at) }];
}

/**
 * Converts time-off periods overlapping a specific day into minutes-from-midnight intervals.
 */
function getTimeOffIntervalsForDay(
  resourceId: string,
  dateStr: string,
  timeOff: TimeOffRow[],
  timeZone: string,
  locationFilter: string | null
): TimeInterval[] {
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  const intervals: TimeInterval[] = [];

  for (const to of timeOff) {
    if (to.resource_id !== resourceId) continue;
    if (locationFilter && to.location_id !== null && to.location_id !== locationFilter) continue;

    const toStart = new Date(to.starts_at);
    const toEnd = new Date(to.ends_at);

    // Check overlap with this day
    if (toEnd <= dayStart || toStart >= dayEnd) continue;

    // Clamp to day boundaries
    const clampedStart = toStart < dayStart ? 0 : toStart.getHours() * 60 + toStart.getMinutes();
    const clampedEnd = toEnd > dayEnd ? 24 * 60 : toEnd.getHours() * 60 + toEnd.getMinutes();

    if (clampedEnd > clampedStart) {
      intervals.push({ start: clampedStart, end: clampedEnd });
    }
  }

  return intervals;
}

/**
 * Merges overlapping intervals into non-overlapping set.
 * Critical: prevents double-subtraction of overlapping time-off.
 */
export function mergeOverlappingIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length <= 1) return intervals;

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const result: TimeInterval[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = result[result.length - 1]!;

    if (current.start <= last.end) {
      // Overlapping — merge
      last.end = Math.max(last.end, current.end);
    } else {
      result.push(current);
    }
  }

  return result;
}

/**
 * Intersects two sets of intervals. Returns only the overlapping portions.
 */
function intersectIntervals(a: TimeInterval[], b: TimeInterval[]): TimeInterval[] {
  const result: TimeInterval[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    const overlapStart = Math.max(a[i]!.start, b[j]!.start);
    const overlapEnd = Math.min(a[i]!.end, b[j]!.end);

    if (overlapStart < overlapEnd) {
      result.push({ start: overlapStart, end: overlapEnd });
    }

    if (a[i]!.end < b[j]!.end) i++;
    else j++;
  }

  return result;
}

/**
 * Subtracts a set of intervals from another. Returns remaining portions.
 */
function subtractIntervals(base: TimeInterval[], subtract: TimeInterval[]): TimeInterval[] {
  let result = [...base];

  for (const sub of subtract) {
    const next: TimeInterval[] = [];
    for (const interval of result) {
      if (sub.end <= interval.start || sub.start >= interval.end) {
        // No overlap
        next.push(interval);
      } else {
        // Overlap — split
        if (sub.start > interval.start) {
          next.push({ start: interval.start, end: sub.start });
        }
        if (sub.end < interval.end) {
          next.push({ start: sub.end, end: interval.end });
        }
      }
    }
    result = next;
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function getIsoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Sunday=7, Mon=1
}
