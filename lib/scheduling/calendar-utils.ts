/**
 * Calendar date/time utilities — Milestone 6.10.
 *
 * Provides DST-safe tenant-local day and week range calculations,
 * date navigation, and pixel positioning helpers for the calendar UI.
 *
 * Key invariants:
 * - All local dates are tenant-local (IANA timezone), never browser-local.
 * - Day boundaries use fromZonedTime for exact instants (DST-aware).
 * - Navigation uses local-date arithmetic, not millisecond offsets.
 * - Positioning uses minute-based calculations from a calendar start hour.
 *
 * These utilities are pure — no database access, no hidden current time.
 */

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format, addDays, startOfWeek } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InstantRange = {
  start: string; // ISO 8601 instant
  end: string;   // ISO 8601 instant
};

export type CalendarConfig = {
  /** First visible hour (0-23), default 7 */
  startHour: number;
  /** Last visible hour (0-23, exclusive), default 21 */
  endHour: number;
  /** Pixels per minute for positioning, default 1.2 */
  pixelsPerMinute: number;
  /** Minimum appointment block height in pixels, default 24 */
  minBlockHeight: number;
};

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  startHour: 7,
  endHour: 21,
  pixelsPerMinute: 1.2,
  minBlockHeight: 24,
};

// ─── Day Range ───────────────────────────────────────────────────────────────

/**
 * Returns the exact UTC instant range for a tenant-local date.
 *
 * The range is [start-of-day, start-of-next-day) — a half-open interval.
 * Handles DST correctly: a spring-forward day is 23 hours, a fall-back day is 25.
 *
 * @param localDate - "YYYY-MM-DD" in tenant timezone
 * @param timeZone - IANA timezone identifier
 */
export function getTenantDayRange(localDate: string, timeZone: string): InstantRange {
  const dayStart = fromZonedTime(new Date(`${localDate}T00:00:00`), timeZone);
  const nextDate = addLocalDay(localDate);
  const dayEnd = fromZonedTime(new Date(`${nextDate}T00:00:00`), timeZone);

  return {
    start: dayStart.toISOString(),
    end: dayEnd.toISOString(),
  };
}

/**
 * Returns the actual duration of a tenant-local day in minutes.
 * Normally 1440, but 1380 on spring-forward or 1500 on fall-back.
 */
export function getTenantDayDurationMinutes(localDate: string, timeZone: string): number {
  const range = getTenantDayRange(localDate, timeZone);
  return (new Date(range.end).getTime() - new Date(range.start).getTime()) / 60_000;
}

// ─── Week Range ──────────────────────────────────────────────────────────────

/**
 * Returns the 7 tenant-local dates forming a week starting on Monday (ISO week).
 *
 * @param localDate - Any "YYYY-MM-DD" within the desired week
 * @param timeZone - IANA timezone identifier
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getTenantWeekDates(localDate: string, _timeZone: string): string[] {
  // Parse the local date
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  const localDateObj = new Date(year, month - 1, day);

  // Get ISO week start (Monday)
  const weekStart = startOfWeek(localDateObj, { weekStartsOn: 1 });

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    dates.push(format(d, "yyyy-MM-dd"));
  }

  return dates;
}

/**
 * Returns the exact UTC instant range covering a full ISO week.
 *
 * @param localDate - Any "YYYY-MM-DD" within the desired week
 * @param timeZone - IANA timezone identifier
 */
export function getTenantWeekRange(localDate: string, timeZone: string): InstantRange {
  const dates = getTenantWeekDates(localDate, timeZone);
  const firstDate = dates[0]!;
  const lastDate = dates[6]!;
  const nextAfterLast = addLocalDay(lastDate);

  const start = fromZonedTime(new Date(`${firstDate}T00:00:00`), timeZone);
  const end = fromZonedTime(new Date(`${nextAfterLast}T00:00:00`), timeZone);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// ─── Date Navigation ─────────────────────────────────────────────────────────

/**
 * Adds N local days to a date string. Uses calendar arithmetic, not UTC offsets.
 *
 * @param localDate - "YYYY-MM-DD"
 * @param days - Number of days to add (can be negative)
 */
export function addTenantLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  const d = new Date(year, month - 1, day);
  const result = addDays(d, days);
  return format(result, "yyyy-MM-dd");
}

/**
 * Returns the next local day. Shorthand for addTenantLocalDays(date, 1).
 */
function addLocalDay(localDate: string): string {
  return addTenantLocalDays(localDate, 1);
}

/**
 * Returns today's date in the tenant timezone.
 */
export function getTenantToday(now: Date, timeZone: string): string {
  const zoned = toZonedTime(now, timeZone);
  return format(zoned, "yyyy-MM-dd");
}

/**
 * Returns tenant-local current time as total minutes from midnight.
 */
export function getTenantCurrentMinutes(now: Date, timeZone: string): number {
  const zoned = toZonedTime(now, timeZone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

// ─── Positioning Utilities ───────────────────────────────────────────────────

/**
 * Calculates the number of minutes from the calendar start hour to a given instant.
 *
 * @param instant - ISO 8601 timestamp
 * @param localDate - The calendar day being displayed "YYYY-MM-DD"
 * @param timeZone - IANA timezone
 * @param startHour - Calendar grid start hour (default 7)
 * @returns Minutes from calendar start. Can be negative (before grid) or beyond grid end.
 */
export function minutesFromCalendarStart(
  instant: string,
  localDate: string,
  timeZone: string,
  startHour: number = DEFAULT_CALENDAR_CONFIG.startHour
): number {
  const zoned = toZonedTime(new Date(instant), timeZone);
  const totalMinutes = zoned.getHours() * 60 + zoned.getMinutes();
  return totalMinutes - startHour * 60;
}

/**
 * Converts minutes from calendar start to pixel offset.
 */
export function minutesToPixelOffset(
  minutes: number,
  pixelsPerMinute: number = DEFAULT_CALENDAR_CONFIG.pixelsPerMinute
): number {
  return Math.max(0, minutes * pixelsPerMinute);
}

/**
 * Converts a duration in minutes to a pixel height.
 * Enforces minimum height for visibility.
 */
export function durationToPixelHeight(
  durationMinutes: number,
  pixelsPerMinute: number = DEFAULT_CALENDAR_CONFIG.pixelsPerMinute,
  minHeight: number = DEFAULT_CALENDAR_CONFIG.minBlockHeight
): number {
  return Math.max(minHeight, durationMinutes * pixelsPerMinute);
}

/**
 * Returns total visible minutes for the calendar grid.
 */
export function getCalendarTotalMinutes(
  startHour: number = DEFAULT_CALENDAR_CONFIG.startHour,
  endHour: number = DEFAULT_CALENDAR_CONFIG.endHour
): number {
  return (endHour - startHour) * 60;
}

/**
 * Returns total pixel height for the calendar grid.
 */
export function getCalendarTotalHeight(config: CalendarConfig = DEFAULT_CALENDAR_CONFIG): number {
  const totalMinutes = getCalendarTotalMinutes(config.startHour, config.endHour);
  return totalMinutes * config.pixelsPerMinute;
}

/**
 * Calculates appointment block position within the calendar grid.
 *
 * @returns top (px), height (px), and whether block extends beyond grid boundaries
 */
export function getAppointmentBlockPosition(
  startsAt: string,
  endsAt: string,
  localDate: string,
  timeZone: string,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG
): { top: number; height: number; clippedTop: boolean; clippedBottom: boolean } {
  const startMinutes = minutesFromCalendarStart(startsAt, localDate, timeZone, config.startHour);
  const endMinutes = minutesFromCalendarStart(endsAt, localDate, timeZone, config.startHour);
  const totalGridMinutes = getCalendarTotalMinutes(config.startHour, config.endHour);

  const clippedTop = startMinutes < 0;
  const clippedBottom = endMinutes > totalGridMinutes;

  const effectiveStart = Math.max(0, startMinutes);
  const effectiveEnd = Math.min(totalGridMinutes, endMinutes);
  const effectiveDuration = effectiveEnd - effectiveStart;

  const top = effectiveStart * config.pixelsPerMinute;
  const height = Math.max(config.minBlockHeight, effectiveDuration * config.pixelsPerMinute);

  return { top, height, clippedTop, clippedBottom };
}

// ─── Hour Labels ─────────────────────────────────────────────────────────────

/**
 * Generates hour labels for the time axis.
 *
 * @returns Array of { hour, label, offsetPx }
 */
export function getTimeAxisLabels(config: CalendarConfig = DEFAULT_CALENDAR_CONFIG): Array<{
  hour: number;
  label: string;
  offsetPx: number;
}> {
  const labels: Array<{ hour: number; label: string; offsetPx: number }> = [];

  for (let h = config.startHour; h < config.endHour; h++) {
    const minutesFromStart = (h - config.startHour) * 60;
    labels.push({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      offsetPx: minutesFromStart * config.pixelsPerMinute,
    });
  }

  return labels;
}

/**
 * Determines the effective calendar start/end hours by expanding defaults
 * to include appointments that fall outside business hours.
 */
export function resolveCalendarBounds(
  appointmentTimes: Array<{ startsAt: string; endsAt: string }>,
  localDate: string,
  timeZone: string,
  defaultStart: number = DEFAULT_CALENDAR_CONFIG.startHour,
  defaultEnd: number = DEFAULT_CALENDAR_CONFIG.endHour
): { startHour: number; endHour: number } {
  let startHour = defaultStart;
  let endHour = defaultEnd;

  for (const appt of appointmentTimes) {
    const startZoned = toZonedTime(new Date(appt.startsAt), timeZone);
    const endZoned = toZonedTime(new Date(appt.endsAt), timeZone);

    const startH = startZoned.getHours();
    const endH = endZoned.getHours() + (endZoned.getMinutes() > 0 ? 1 : 0);

    if (startH < startHour) startHour = startH;
    if (endH > endHour) endHour = Math.min(24, endH);
  }

  return { startHour, endHour };
}
