/**
 * Day Gap Calculator — Milestone 12.4.
 *
 * Pure utility. Calculates free-time intervals between
 * appointments within working periods, minus time-off.
 *
 * Free gaps are informational — not claimed as bookable slots.
 */

export type TimeRange = { start: number; end: number }; // minutes from midnight

const MIN_GAP_MINUTES = 10;

/**
 * Calculates free-time gaps for a staff day.
 *
 * @param workingPeriods - configured working time ranges
 * @param blockedRanges - appointments + time off ranges
 * @returns Array of free intervals (>= MIN_GAP_MINUTES)
 */
export function calculateDayGaps(
  workingPeriods: TimeRange[],
  blockedRanges: TimeRange[]
): TimeRange[] {
  if (workingPeriods.length === 0) return [];

  // Sort and merge blocked ranges
  const sorted = [...blockedRanges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  // For each working period, subtract blocked ranges
  const gaps: TimeRange[] = [];

  for (const period of workingPeriods) {
    let cursor = period.start;

    for (const blocked of merged) {
      if (blocked.start >= period.end) break;
      if (blocked.end <= cursor) continue;

      const gapStart = cursor;
      const gapEnd = Math.min(blocked.start, period.end);

      if (gapEnd > gapStart && (gapEnd - gapStart) >= MIN_GAP_MINUTES) {
        gaps.push({ start: gapStart, end: gapEnd });
      }

      cursor = Math.max(cursor, blocked.end);
    }

    // Trailing gap after last blocked range
    if (cursor < period.end && (period.end - cursor) >= MIN_GAP_MINUTES) {
      gaps.push({ start: cursor, end: period.end });
    }
  }

  return gaps;
}

/**
 * Converts HH:MM time string to minutes from midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Converts minutes from midnight to HH:MM string.
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
