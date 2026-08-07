/**
 * Analytics Date Range Resolution — Milestone 8.4.
 *
 * Resolves dashboard period presets into exact UTC instant ranges
 * using the tenant timezone. Pure utility — no database access.
 */

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { AnalyticsPeriod, AnalyticsDateRange } from "../types/analytics";

/**
 * Resolves a named period into start/end UTC instants using tenant timezone.
 */
export function resolveAnalyticsDateRange(
  period: AnalyticsPeriod,
  now: Date,
  timeZone: string
): AnalyticsDateRange {
  const zonedNow = toZonedTime(now, timeZone);
  const today = format(zonedNow, "yyyy-MM-dd");

  switch (period) {
    case "today": {
      const start = fromZonedTime(new Date(`${today}T00:00:00`), timeZone);
      const tomorrow = format(subDays(zonedNow, -1), "yyyy-MM-dd");
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Today" };
    }

    case "7days": {
      const startDate = format(subDays(zonedNow, 6), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const tomorrow = format(subDays(zonedNow, -1), "yyyy-MM-dd");
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Last 7 days" };
    }

    case "this_month": {
      const monthStart = startOfMonth(zonedNow);
      const startDate = format(monthStart, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const tomorrow = format(subDays(zonedNow, -1), "yyyy-MM-dd");
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "This month" };
    }

    case "prev_month": {
      const prevMonth = subMonths(zonedNow, 1);
      const monthStart = startOfMonth(prevMonth);
      const monthEnd = endOfMonth(prevMonth);
      const startDate = format(monthStart, "yyyy-MM-dd");
      const endDate = format(subDays(monthEnd, -1), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous month" };
    }
  }
}

/**
 * Resolves the comparison (previous equivalent) period for a given period.
 */
export function resolveComparisonRange(
  period: AnalyticsPeriod,
  now: Date,
  timeZone: string
): AnalyticsDateRange | null {
  const zonedNow = toZonedTime(now, timeZone);

  switch (period) {
    case "today": {
      const yesterday = format(subDays(zonedNow, 1), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${yesterday}T00:00:00`), timeZone);
      const today = format(zonedNow, "yyyy-MM-dd");
      const end = fromZonedTime(new Date(`${today}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Yesterday" };
    }

    case "7days": {
      const startDate = format(subDays(zonedNow, 13), "yyyy-MM-dd");
      const endDate = format(subDays(zonedNow, 6), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous 7 days" };
    }

    case "this_month": {
      const prevMonth = subMonths(zonedNow, 1);
      const monthStart = startOfMonth(prevMonth);
      const monthEnd = endOfMonth(prevMonth);
      const startDate = format(monthStart, "yyyy-MM-dd");
      const endDate = format(subDays(monthEnd, -1), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous month" };
    }

    case "prev_month": {
      const twoMonthsAgo = subMonths(zonedNow, 2);
      const monthStart = startOfMonth(twoMonthsAgo);
      const monthEnd = endOfMonth(twoMonthsAgo);
      const startDate = format(monthStart, "yyyy-MM-dd");
      const endDate = format(subDays(monthEnd, -1), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "2 months ago" };
    }
  }
}

/**
 * Generates an array of date strings (YYYY-MM-DD) between start and end in tenant timezone.
 */
export function getDateSeriesInRange(startIso: string, endIso: string, timeZone: string): string[] {
  const dates: string[] = [];
  const startDate = toZonedTime(new Date(startIso), timeZone);
  const endDate = toZonedTime(new Date(endIso), timeZone);

  let current = startDate;
  while (current < endDate) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = subDays(current, -1);
  }

  return dates;
}
