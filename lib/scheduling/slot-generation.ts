/**
 * Pure candidate slot generation utility.
 *
 * Generates candidate time slots from available instant ranges given
 * service duration, buffers, and slot interval configuration.
 *
 * This is a pure function with no database access, no hidden use of
 * current time, and no input mutation.
 */

import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import type { InstantRange } from "./instant-ranges";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CandidateSlot = {
  /** Customer-visible service start (ISO instant) */
  startsAt: string;
  /** Customer-visible service end (ISO instant) */
  endsAt: string;
  /** Occupied window start including buffer_before (ISO instant) */
  occupiedWindowStartsAt: string;
  /** Occupied window end including buffer_after (ISO instant) */
  occupiedWindowEndsAt: string;
  /** Local start time "HH:mm" in tenant timezone */
  localStartTime: string;
  /** Local end time "HH:mm" in tenant timezone */
  localEndTime: string;
};

export type SlotGenerationInput = {
  /** Available instant ranges after all subtractions [start, end) */
  availableRanges: InstantRange[];
  /** Service duration in minutes */
  durationMinutes: number;
  /** Buffer before service in minutes */
  bufferBeforeMinutes: number;
  /** Buffer after service in minutes */
  bufferAfterMinutes: number;
  /** Slot interval in minutes (alignment grid) */
  intervalMinutes: number;
  /** IANA timezone for local time display */
  timeZone: string;
  /** Local date "YYYY-MM-DD" for alignment */
  localDate: string;
  /** Optional current instant for past-time filtering. */
  now?: Date;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MS_PER_MINUTE = 60_000;

// ─── Generation ──────────────────────────────────────────────────────────────

/**
 * Generates candidate slots by stepping through available ranges at the
 * configured interval, ensuring the full occupied window (buffer_before +
 * duration + buffer_after) fits within each uninterrupted available range.
 *
 * Slot alignment is based on tenant-local wall-clock time relative to midnight.
 *
 * Past-time filtering: If `now` is provided and the localDate is the current
 * tenant-local date, slots whose service start is before `now` are excluded.
 * For past dates, no slots are generated. For future dates, no filtering.
 */
export function generateCandidateSlots(input: SlotGenerationInput): CandidateSlot[] {
  const {
    availableRanges,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    intervalMinutes,
    timeZone,
    localDate,
    now,
  } = input;

  if (availableRanges.length === 0) return [];
  if (durationMinutes <= 0) return [];
  if (intervalMinutes <= 0) return [];

  const totalOccupiedMinutes = bufferBeforeMinutes + durationMinutes + bufferAfterMinutes;

  const nowMs = now ? now.getTime() : null;

  // For past dates, return empty
  if (now) {
    const todayInTz = format(toZonedTime(now, timeZone), "yyyy-MM-dd");
    if (localDate < todayInTz) return [];
  }

  const slots: CandidateSlot[] = [];
  const seenStarts = new Set<number>();

  for (const range of availableRanges) {
    const rangeStartMs = new Date(range.start).getTime();
    const rangeEndMs = new Date(range.end).getTime();

    const earliestServiceStartMs = rangeStartMs + bufferBeforeMinutes * MS_PER_MINUTE;

    const alignedStartMs = alignToIntervalGrid(
      earliestServiceStartMs,
      intervalMinutes,
      timeZone
    );

    let serviceStartMs = alignedStartMs;

    while (true) {
      const occupiedStartMs = serviceStartMs - bufferBeforeMinutes * MS_PER_MINUTE;
      const serviceEndMs = serviceStartMs + durationMinutes * MS_PER_MINUTE;
      const occupiedEndMs = serviceEndMs + bufferAfterMinutes * MS_PER_MINUTE;

      if (occupiedStartMs < rangeStartMs) {
        serviceStartMs += intervalMinutes * MS_PER_MINUTE;
        continue;
      }

      if (occupiedEndMs > rangeEndMs) break;
      if (totalOccupiedMinutes <= 0) break;

      if (nowMs !== null && serviceStartMs < nowMs) {
        serviceStartMs += intervalMinutes * MS_PER_MINUTE;
        continue;
      }

      if (seenStarts.has(serviceStartMs)) {
        serviceStartMs += intervalMinutes * MS_PER_MINUTE;
        continue;
      }
      seenStarts.add(serviceStartMs);

      const localStart = formatLocalTime(serviceStartMs, timeZone);
      const localEnd = formatLocalTime(serviceEndMs, timeZone);

      slots.push({
        startsAt: new Date(serviceStartMs).toISOString(),
        endsAt: new Date(serviceEndMs).toISOString(),
        occupiedWindowStartsAt: new Date(occupiedStartMs).toISOString(),
        occupiedWindowEndsAt: new Date(occupiedEndMs).toISOString(),
        localStartTime: localStart,
        localEndTime: localEnd,
      });

      serviceStartMs += intervalMinutes * MS_PER_MINUTE;
    }
  }

  return slots;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Formats a UTC timestamp as "HH:mm" in the given timezone.
 */
function formatLocalTime(timestampMs: number, timeZone: string): string {
  const zoned = toZonedTime(new Date(timestampMs), timeZone);
  return format(zoned, "HH:mm");
}

/**
 * Aligns a timestamp to the next interval boundary in tenant-local time.
 */
function alignToIntervalGrid(
  timestampMs: number,
  intervalMinutes: number,
  timeZone: string
): number {
  const zoned = toZonedTime(new Date(timestampMs), timeZone);
  const hours = zoned.getHours();
  const minutes = zoned.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const remainder = totalMinutes % intervalMinutes;
  if (remainder === 0) {
    // Zero out seconds/ms for clean timestamps
    const seconds = zoned.getSeconds();
    const ms = zoned.getMilliseconds();
    return timestampMs - seconds * 1000 - ms;
  }

  const advanceMinutes = intervalMinutes - remainder;
  const secondsMs = zoned.getSeconds() * 1000 + zoned.getMilliseconds();
  return timestampMs + advanceMinutes * MS_PER_MINUTE - secondsMs;
}
