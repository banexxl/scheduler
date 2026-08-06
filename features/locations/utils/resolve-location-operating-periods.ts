import { getIsoDayOfWeek, sortPeriods } from "@/lib/scheduling/scheduling-constants";
import type { LocationBusinessHour } from "../types/location-business-hour";
import type {
  LocationExceptionWithPeriods,
  ResolvedLocationOperatingPeriods,
} from "../types/location-schedule-exception";

/**
 * Resolves the effective operating periods for a location on a given date.
 *
 * Resolution order:
 * 1. If an active exception exists for the date:
 *    - "closed" → empty periods
 *    - "custom_hours" → use exception periods (replaces weekly hours)
 * 2. Otherwise: use active recurring business hours for that weekday.
 *
 * This is a pure, deterministic utility. It does NOT:
 * - Perform time-zone conversion
 * - Intersect with resource hours
 * - Apply resource time off
 * - Generate bookable slots
 *
 * @param date - Local date string "YYYY-MM-DD" or Date object
 * @param weeklyHours - All recurring business hours for the location
 * @param exception - Optional active exception for this date (with periods)
 */
export function resolveLocationOperatingPeriods(
  date: string | Date,
  weeklyHours: LocationBusinessHour[],
  exception?: LocationExceptionWithPeriods | null
): ResolvedLocationOperatingPeriods {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0]!;

  // If an active exception exists, it replaces weekly hours
  if (exception && exception.isActive) {
    if (exception.exceptionType === "closed") {
      return {
        date: dateStr,
        source: "closed_exception",
        periods: [],
      };
    }

    // custom_hours: use exception periods
    const sorted = sortPeriods(
      exception.periods.map((p) => ({
        startTime: p.startTime,
        endTime: p.endTime,
      }))
    );

    return {
      date: dateStr,
      source: "custom_exception",
      periods: sorted,
    };
  }

  // No exception: use recurring weekly hours for that weekday
  const dateObj = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  const dayOfWeek = getIsoDayOfWeek(dateObj);

  const activePeriods = weeklyHours
    .filter((h) => h.isActive && h.dayOfWeek === dayOfWeek)
    .map((h) => ({ startTime: h.startTime, endTime: h.endTime }));

  const sorted = sortPeriods(activePeriods);

  return {
    date: dateStr,
    source: "weekly",
    periods: sorted,
  };
}
