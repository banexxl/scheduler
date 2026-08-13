/**
 * Advanced Analytics Date Range Resolution — Milestone 15.9.
 *
 * Extends existing date-range utilities with 30d, this_quarter,
 * this_year, and custom ranges. Pure utility — no database access.
 */

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import type { AdvancedAnalyticsPeriod } from "../types/advanced-analytics";
import type { AnalyticsDateRange } from "../types/analytics";
import { MAX_CUSTOM_RANGE_DAYS } from "../types/advanced-analytics";

/**
 * Resolves an advanced period into start/end UTC instants using tenant timezone.
 */
export function resolveAdvancedDateRange(
  period: AdvancedAnalyticsPeriod,
  now: Date,
  timeZone: string,
  customStart?: string,
  customEnd?: string
): AnalyticsDateRange {
  const zonedNow = toZonedTime(now, timeZone);
  const today = format(zonedNow, "yyyy-MM-dd");
  const tomorrow = format(subDays(zonedNow, -1), "yyyy-MM-dd");

  switch (period) {
    case "today": {
      const start = fromZonedTime(new Date(`${today}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Today" };
    }

    case "7days": {
      const startDate = format(subDays(zonedNow, 6), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Last 7 days" };
    }

    case "30days": {
      const startDate = format(subDays(zonedNow, 29), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Last 30 days" };
    }

    case "this_month": {
      const monthStart = startOfMonth(zonedNow);
      const startDate = format(monthStart, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
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

    case "this_quarter": {
      const month = zonedNow.getMonth();
      const quarterStartMonth = month - (month % 3);
      const qStart = new Date(zonedNow.getFullYear(), quarterStartMonth, 1);
      const startDate = format(qStart, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "This quarter" };
    }

    case "this_year": {
      const yearStart = startOfYear(zonedNow);
      const startDate = format(yearStart, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${tomorrow}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "This year" };
    }

    case "custom": {
      if (!customStart || !customEnd) {
        // Fallback to 30 days
        return resolveAdvancedDateRange("30days", now, timeZone);
      }
      const start = fromZonedTime(new Date(`${customStart}T00:00:00`), timeZone);
      const endDate = format(subDays(new Date(customEnd), -1), "yyyy-MM-dd");
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: `${customStart} – ${customEnd}` };
    }
  }
}

/**
 * Resolves comparison period for the given advanced period.
 * Returns the equivalent previous period of the same duration.
 */
export function resolveAdvancedComparisonRange(
  period: AdvancedAnalyticsPeriod,
  now: Date,
  timeZone: string,
  customStart?: string,
  customEnd?: string
): AnalyticsDateRange | null {
  const zonedNow = toZonedTime(now, timeZone);

  switch (period) {
    case "today": {
      const yesterday = format(subDays(zonedNow, 1), "yyyy-MM-dd");
      const today = format(zonedNow, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${yesterday}T00:00:00`), timeZone);
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

    case "30days": {
      const startDate = format(subDays(zonedNow, 59), "yyyy-MM-dd");
      const endDate = format(subDays(zonedNow, 29), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous 30 days" };
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

    case "this_quarter": {
      const month = zonedNow.getMonth();
      const quarterStartMonth = month - (month % 3);
      const prevQEnd = new Date(zonedNow.getFullYear(), quarterStartMonth, 1);
      const prevQStart = new Date(zonedNow.getFullYear(), quarterStartMonth - 3, 1);
      const startDate = format(prevQStart, "yyyy-MM-dd");
      const endDate = format(prevQEnd, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous quarter" };
    }

    case "this_year": {
      const prevYearStart = new Date(zonedNow.getFullYear() - 1, 0, 1);
      const prevYearEnd = new Date(zonedNow.getFullYear(), 0, 1);
      const startDate = format(prevYearStart, "yyyy-MM-dd");
      const endDate = format(prevYearEnd, "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${startDate}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${endDate}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous year" };
    }

    case "custom": {
      if (!customStart || !customEnd) return null;
      const days = Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86_400_000);
      const prevEnd = customStart;
      const prevStart = format(subDays(new Date(customStart), days), "yyyy-MM-dd");
      const start = fromZonedTime(new Date(`${prevStart}T00:00:00`), timeZone);
      const end = fromZonedTime(new Date(`${prevEnd}T00:00:00`), timeZone);
      return { start: start.toISOString(), end: end.toISOString(), label: "Previous period" };
    }
  }
}

/**
 * Validates custom date range against safety bounds.
 */
export function validateCustomRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: "Invalid date format." };
  }

  if (start >= end) {
    return { valid: false, error: "Start date must be before end date." };
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days > MAX_CUSTOM_RANGE_DAYS) {
    return { valid: false, error: `Maximum range is ${MAX_CUSTOM_RANGE_DAYS} days (~5 years).` };
  }

  return { valid: true };
}

/**
 * Calculates percentage change between two values.
 * Returns null if previous is 0 (cannot compute meaningful change).
 * Handles edge cases: NaN, Infinity.
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : null;
  const change = ((current - previous) / previous) * 100;
  if (!isFinite(change)) return null;
  return Math.round(change * 10) / 10; // 1 decimal place
}

/**
 * Determines change direction for UI display.
 */
export function getChangeDirection(change: number | null): "up" | "down" | "flat" | null {
  if (change === null) return null;
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "flat";
}
