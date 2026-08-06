/**
 * Pure utilities for working with local wall-clock time periods (HH:mm format).
 *
 * These operate on a single local date and do NOT perform timezone conversion.
 * All inputs and outputs use "HH:mm" strings representing tenant-local wall-clock time.
 *
 * Used by the availability engine to intersect location operating periods
 * with resource working periods before converting to exact instants.
 */

import type { TimePeriod } from "./scheduling-constants";
import { compareTime, sortPeriods } from "./scheduling-constants";

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Merges overlapping or adjacent time periods into a minimal sorted set.
 * Does not mutate the input array.
 *
 * Example:
 *   Input:  [09:00–12:00, 11:00–14:00, 15:00–17:00]
 *   Output: [09:00–14:00, 15:00–17:00]
 */
export function normalizeTimePeriods(periods: TimePeriod[]): TimePeriod[] {
  if (periods.length === 0) return [];

  const sorted = sortPeriods(periods);
  const result: TimePeriod[] = [];

  let current = { ...sorted[0]! };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;

    // Overlapping or adjacent: merge
    if (compareTime(next.startTime, current.endTime) <= 0) {
      if (compareTime(next.endTime, current.endTime) > 0) {
        current.endTime = next.endTime;
      }
    } else {
      result.push(current);
      current = { ...next };
    }
  }

  result.push(current);
  return result;
}

// ─── Intersection ────────────────────────────────────────────────────────────

/**
 * Computes the intersection of two sets of time periods.
 * Returns only positive-length overlapping segments, sorted by start time.
 *
 * Both inputs should be sorted and non-overlapping for correct results,
 * but the function normalizes them internally for safety.
 *
 * Does not mutate inputs.
 *
 * Example:
 *   Left:  [09:00–17:00]
 *   Right: [08:00–12:00]
 *   Result: [09:00–12:00]
 *
 * Example:
 *   Left:  [09:00–13:00, 14:00–18:00]
 *   Right: [10:00–16:00]
 *   Result: [10:00–13:00, 14:00–16:00]
 */
export function intersectTimePeriods(
  left: TimePeriod[],
  right: TimePeriod[]
): TimePeriod[] {
  if (left.length === 0 || right.length === 0) return [];

  const normLeft = normalizeTimePeriods(left);
  const normRight = normalizeTimePeriods(right);

  const result: TimePeriod[] = [];
  let i = 0;
  let j = 0;

  while (i < normLeft.length && j < normRight.length) {
    const a = normLeft[i]!;
    const b = normRight[j]!;

    // Compute overlap
    const start = compareTime(a.startTime, b.startTime) >= 0 ? a.startTime : b.startTime;
    const end = compareTime(a.endTime, b.endTime) <= 0 ? a.endTime : b.endTime;

    // Positive-length intersection
    if (compareTime(start, end) < 0) {
      result.push({ startTime: start, endTime: end });
    }

    // Advance the pointer whose period ends first
    if (compareTime(a.endTime, b.endTime) <= 0) {
      i++;
    } else {
      j++;
    }
  }

  return result;
}

// ─── Alignment ───────────────────────────────────────────────────────────────

/**
 * Converts an "HH:mm" time string to total minutes from midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

/**
 * Converts total minutes from midnight to "HH:mm" format.
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Returns the first aligned time at or after `time` that aligns to the given interval.
 * Alignment is relative to midnight (00:00).
 *
 * Example:
 *   alignLocalTimeToInterval("09:07", 15) → "09:15"
 *   alignLocalTimeToInterval("09:00", 15) → "09:00"
 *   alignLocalTimeToInterval("09:01", 5)  → "09:05"
 */
export function alignLocalTimeToInterval(
  time: string,
  intervalMinutes: number
): string {
  const totalMinutes = timeToMinutes(time);
  const remainder = totalMinutes % intervalMinutes;

  if (remainder === 0) return time;

  const aligned = totalMinutes + (intervalMinutes - remainder);
  return minutesToTime(aligned);
}
