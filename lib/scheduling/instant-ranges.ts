/**
 * Pure utilities for working with exact instant ranges (timestamps).
 *
 * All ranges use half-open intervals: [start, end)
 * - start is inclusive
 * - end is exclusive
 *
 * Instants are represented as ISO 8601 strings or millisecond timestamps.
 * Functions accept both and return ISO strings for consistency.
 *
 * Used by the availability engine to subtract time-off from working periods
 * after timezone conversion to exact instants.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type InstantRange = {
  start: string; // ISO 8601 timestamp
  end: string;   // ISO 8601 timestamp
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMs(instant: string): number {
  return new Date(instant).getTime();
}

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

// ─── Merge ───────────────────────────────────────────────────────────────────

/**
 * Merges overlapping or adjacent instant ranges into a minimal sorted set.
 * Does not mutate input.
 *
 * Example:
 *   Input:  [09:00–12:00, 11:00–14:00, 15:00–17:00]
 *   Output: [09:00–14:00, 15:00–17:00]
 */
export function mergeInstantRanges(ranges: InstantRange[]): InstantRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => toMs(a.start) - toMs(b.start));
  const result: InstantRange[] = [];

  let currentStart = toMs(sorted[0]!.start);
  let currentEnd = toMs(sorted[0]!.end);

  for (let i = 1; i < sorted.length; i++) {
    const nextStart = toMs(sorted[i]!.start);
    const nextEnd = toMs(sorted[i]!.end);

    // Overlapping or adjacent
    if (nextStart <= currentEnd) {
      currentEnd = Math.max(currentEnd, nextEnd);
    } else {
      result.push({ start: toIso(currentStart), end: toIso(currentEnd) });
      currentStart = nextStart;
      currentEnd = nextEnd;
    }
  }

  result.push({ start: toIso(currentStart), end: toIso(currentEnd) });
  return result;
}

// ─── Subtraction ─────────────────────────────────────────────────────────────

/**
 * Subtracts blocked ranges from available ranges.
 * Returns the remaining available ranges after removing all blocked intervals.
 *
 * Both inputs use half-open intervals [start, end).
 * Does not mutate inputs.
 *
 * A single blocked range can split an available range into two parts.
 * Multiple blocked ranges are merged first to simplify processing.
 *
 * Example:
 *   Available: [09:00–17:00]
 *   Blocked:   [12:00–13:00]
 *   Result:    [09:00–12:00, 13:00–17:00]
 */
export function subtractInstantRanges(
  available: InstantRange[],
  blocked: InstantRange[]
): InstantRange[] {
  if (available.length === 0) return [];
  if (blocked.length === 0) return [...available];

  // Merge and sort blocked ranges
  const mergedBlocked = mergeInstantRanges(blocked);

  const result: InstantRange[] = [];

  for (const avail of available) {
    let currentStart = toMs(avail.start);
    const availEnd = toMs(avail.end);

    for (const block of mergedBlocked) {
      const blockStart = toMs(block.start);
      const blockEnd = toMs(block.end);

      // Block is entirely after current remaining range
      if (blockStart >= availEnd) break;

      // Block is entirely before current start
      if (blockEnd <= currentStart) continue;

      // There's overlap — emit the part before the block
      if (blockStart > currentStart) {
        result.push({ start: toIso(currentStart), end: toIso(blockStart) });
      }

      // Advance past the block
      currentStart = Math.max(currentStart, blockEnd);
    }

    // Emit remaining part after all blocks
    if (currentStart < availEnd) {
      result.push({ start: toIso(currentStart), end: toIso(availEnd) });
    }
  }

  return result;
}
