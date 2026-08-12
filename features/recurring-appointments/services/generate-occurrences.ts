/**
 * Recurring Occurrence Generator — Milestone 15.1.
 *
 * Pure function: generates occurrence timestamps from a recurrence rule.
 * Uses tenant timezone for local time stability across DST.
 * No database access.
 *
 * Design principles:
 * - Deterministic: same input → same output
 * - Timezone-aware: generates from local time, converts to UTC
 * - Bounded: enforces max occurrence limit
 * - DST-safe: local appointment time remains stable across transitions
 */

import { fromZonedTime } from "date-fns-tz";
import type { RecurrenceRule, GeneratedOccurrence } from "../types/recurrence";
import { MAX_SERIES_OCCURRENCES } from "../types/recurrence";

/**
 * Generates recurring occurrence timestamps.
 *
 * @param rule - The recurrence rule
 * @param durationMinutes - Appointment duration
 * @returns Array of generated occurrences with local and UTC times
 */
export function generateRecurringOccurrences(
  rule: RecurrenceRule,
  durationMinutes: number
): GeneratedOccurrence[] {
  const maxCount = Math.min(
    rule.occurrenceCount ?? MAX_SERIES_OCCURRENCES,
    MAX_SERIES_OCCURRENCES
  );

  const endDate = rule.endsOn ? new Date(rule.endsOn + "T23:59:59") : null;
  const occurrences: GeneratedOccurrence[] = [];

  let currentDate = new Date(rule.startsOn + "T00:00:00");
  let index = 0;

  // Safety: prevent infinite loops
  const maxIterations = maxCount * 100;
  let iterations = 0;

  while (occurrences.length < maxCount && iterations < maxIterations) {
    iterations++;

    // Check end date
    if (endDate && currentDate > endDate) break;

    const shouldInclude = shouldIncludeDate(currentDate, rule);

    if (shouldInclude) {
      index++;
      const localDateStr = formatLocalDate(currentDate);
      const localTimeStr = rule.startsAtLocalTime;

      // Create local datetime and convert to UTC using timezone
      const localDateTimeStr = `${localDateStr}T${localTimeStr}:00`;
      const startsAtUtc = fromZonedTime(localDateTimeStr, rule.timezone);
      const endsAtUtc = new Date(startsAtUtc.getTime() + durationMinutes * 60_000);

      occurrences.push({
        index,
        localDate: localDateStr,
        localTime: localTimeStr,
        startsAtUtc: startsAtUtc.toISOString(),
        endsAtUtc: endsAtUtc.toISOString(),
      });
    }

    // Advance to next candidate date
    currentDate = getNextCandidateDate(currentDate, rule, shouldInclude);
  }

  return occurrences;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shouldIncludeDate(date: Date, rule: RecurrenceRule): boolean {
  switch (rule.type) {
    case "daily":
      return true; // daily includes every candidate

    case "weekly": {
      const dow = date.getDay(); // 0=Sunday
      return (rule.daysOfWeek ?? []).includes(dow);
    }

    case "monthly": {
      const dom = date.getDate();
      return dom === rule.dayOfMonth;
    }

    default:
      return false;
  }
}

function getNextCandidateDate(current: Date, rule: RecurrenceRule, wasIncluded: boolean): Date {
  const next = new Date(current);

  switch (rule.type) {
    case "daily":
      next.setDate(next.getDate() + rule.interval);
      break;

    case "weekly":
      // Advance one day at a time to find next selected weekday
      next.setDate(next.getDate() + 1);
      // If we've passed all selected days this week, jump forward (interval - 1) weeks
      if (wasIncluded && rule.interval > 1) {
        const selectedDays = (rule.daysOfWeek ?? []).sort((a, b) => a - b);
        const currentDow = current.getDay();
        const maxSelectedDay = selectedDays[selectedDays.length - 1] ?? 6;
        if (currentDow >= maxSelectedDay) {
          // We've hit the last selected day this week — skip ahead
          const daysUntilNextWeekStart = 7 - currentDow + (selectedDays[0] ?? 0);
          const extraWeeks = (rule.interval - 1) * 7;
          next.setDate(current.getDate() + daysUntilNextWeekStart + extraWeeks);
        }
      }
      break;

    case "monthly":
      // Advance to next month
      if (wasIncluded || current.getDate() > (rule.dayOfMonth ?? 1)) {
        next.setMonth(next.getMonth() + rule.interval);
        next.setDate(1); // Reset to 1st, then check if dayOfMonth exists
        const targetDay = rule.dayOfMonth ?? 1;
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        if (targetDay <= daysInMonth) {
          next.setDate(targetDay);
        } else {
          // Day doesn't exist in this month — skip (advance again)
          next.setDate(daysInMonth + 1); // triggers next month on next iteration
        }
      } else {
        next.setDate(next.getDate() + 1);
      }
      break;
  }

  return next;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Recurrence Summary Formatter ────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Formats a human-readable recurrence summary.
 */
export function formatRecurrenceSummary(rule: RecurrenceRule): string {
  const time = rule.startsAtLocalTime;

  switch (rule.type) {
    case "daily":
      if (rule.interval === 1) return `Every day at ${time}`;
      return `Every ${rule.interval} days at ${time}`;

    case "weekly": {
      const days = (rule.daysOfWeek ?? [])
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d])
        .join(", ");
      if (rule.interval === 1) return `Every ${days} at ${time}`;
      return `Every ${rule.interval} weeks on ${days} at ${time}`;
    }

    case "monthly": {
      const day = rule.dayOfMonth ?? 1;
      const suffix = getOrdinalSuffix(day);
      if (rule.interval === 1) return `Monthly on the ${day}${suffix} at ${time}`;
      return `Every ${rule.interval} months on the ${day}${suffix} at ${time}`;
    }

    default:
      return "Custom recurrence";
  }
}

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
