/**
 * Shared scheduling constants and utilities used by both
 * resource schedules and location business hours.
 *
 * Day-of-week convention: ISO 8601
 *   1 = Monday, 2 = Tuesday, ..., 7 = Sunday
 */

// ─── Day-of-Week ─────────────────────────────────────────────────────────────

export const DAY_OF_WEEK = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK];

export const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

// ─── Time Helpers ────────────────────────────────────────────────────────────

/** Regex for HH:mm format (00:00–23:59) */
export const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validates a time string is in HH:mm format */
export function isValidTime(time: string): boolean {
  return TIME_FORMAT_REGEX.test(time);
}

/** Compares two HH:mm time strings. Returns negative if a < b, 0 if equal, positive if a > b. */
export function compareTime(a: string, b: string): number {
  return a.localeCompare(b);
}

// ─── Period Overlap Detection ────────────────────────────────────────────────

export type TimePeriod = {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
};

/**
 * Checks whether two time periods overlap.
 * Adjacent periods (end of one equals start of another) do NOT overlap.
 */
export function periodsOverlap(a: TimePeriod, b: TimePeriod): boolean {
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

/**
 * Checks whether a collection of periods contains any overlapping pairs.
 * Returns the first overlapping pair indices or null if no overlap.
 */
export function findOverlappingPeriods(
  periods: TimePeriod[]
): [number, number] | null {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      if (periodsOverlap(periods[i]!, periods[j]!)) {
        return [i, j];
      }
    }
  }
  return null;
}

/**
 * Sorts periods by start time, then end time.
 */
export function sortPeriods<T extends TimePeriod>(periods: T[]): T[] {
  return [...periods].sort((a, b) =>
    a.startTime !== b.startTime
      ? a.startTime.localeCompare(b.startTime)
      : a.endTime.localeCompare(b.endTime)
  );
}

// ─── ISO Weekday from Date ───────────────────────────────────────────────────

/**
 * Gets the ISO day of week (1=Mon..7=Sun) from a JavaScript Date.
 * Converts from JS convention (0=Sun..6=Sat).
 */
export function getIsoDayOfWeek(date: Date): DayOfWeek {
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
}
