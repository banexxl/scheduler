/**
 * Strict local-time ↔ instant conversion utilities — Milestone 6.8.
 *
 * These functions handle DST-safe conversions between local wall-clock
 * times and UTC instants using IANA time zones.
 *
 * DST Policy:
 * - Spring-forward (nonexistent local time): Returns an error result.
 *   The caller must skip or flag the time rather than silently shifting.
 * - Fall-back (ambiguous local time): Selects the EARLIER occurrence
 *   (first instant before the clock repeats). This is deterministic and
 *   matches date-fns-tz default behavior with TZDate.
 *
 * These utilities are pure — no database access, no hidden current time.
 */

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StrictConversionResult =
  | { ok: true; instant: Date }
  | { ok: false; reason: "nonexistent" | "invalid_input" };

// ─── localDateTimeToInstantStrict ────────────────────────────────────────────

/**
 * Converts a local date + local time to a UTC instant with strict round-trip
 * verification.
 *
 * 1. Accepts a local date (YYYY-MM-DD), local time (HH:mm), and IANA time zone.
 * 2. Converts to a UTC instant using `fromZonedTime`.
 * 3. Round-trips the instant back to the supplied zone.
 * 4. Verifies the resulting local date and time match the input.
 * 5. Returns an error when they don't match (nonexistent spring-forward time).
 *
 * For fall-back ambiguity, the earlier occurrence is selected (date-fns-tz
 * default behavior).
 *
 * @param localDate - Date string in "YYYY-MM-DD" format
 * @param localTime - Time string in "HH:mm" format
 * @param timeZone - IANA time zone identifier (e.g., "America/New_York")
 */
export function localDateTimeToInstantStrict(
  localDate: string,
  localTime: string,
  timeZone: string
): StrictConversionResult {
  // Validate input format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!/^\d{2}:\d{2}$/.test(localTime)) {
    return { ok: false, reason: "invalid_input" };
  }

  // Parse into components
  const [, month, day] = localDate.split("-").map(Number) as [number, number, number];
  const [hours, minutes] = localTime.split(":").map(Number) as [number, number];

  // Basic range validation
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: "invalid_input" };
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { ok: false, reason: "invalid_input" };
  }

  // Construct the local datetime string and convert to instant
  const localDateTimeStr = `${localDate}T${localTime}:00`;
  const instant = fromZonedTime(new Date(localDateTimeStr), timeZone);

  // Verify: instant must be a valid date
  if (isNaN(instant.getTime())) {
    return { ok: false, reason: "invalid_input" };
  }

  // Round-trip: convert instant back to the given zone
  const roundTripped = toZonedTime(instant, timeZone);
  const rtDate = format(roundTripped, "yyyy-MM-dd");
  const rtTime = format(roundTripped, "HH:mm");

  // Strict check: the round-tripped local date/time must match input
  if (rtDate !== localDate || rtTime !== localTime) {
    // This happens during spring-forward: the local time doesn't exist
    return { ok: false, reason: "nonexistent" };
  }

  return { ok: true, instant };
}

// ─── getTenantLocalDate ──────────────────────────────────────────────────────

/**
 * Returns the current local date in a tenant's time zone as "YYYY-MM-DD".
 *
 * Uses the provided `now` instant to avoid hidden dependencies on system time.
 *
 * @param now - The current UTC instant
 * @param timeZone - IANA time zone identifier
 */
export function getTenantLocalDate(now: Date, timeZone: string): string {
  const zoned = toZonedTime(now, timeZone);
  return format(zoned, "yyyy-MM-dd");
}

// ─── getTenantLocalDateTime ──────────────────────────────────────────────────

/**
 * Returns the current local date and time in a tenant's time zone.
 *
 * @param now - The current UTC instant
 * @param timeZone - IANA time zone identifier
 * @returns Object with localDate ("YYYY-MM-DD") and localTime ("HH:mm")
 */
export function getTenantLocalDateTime(
  now: Date,
  timeZone: string
): { localDate: string; localTime: string } {
  const zoned = toZonedTime(now, timeZone);
  return {
    localDate: format(zoned, "yyyy-MM-dd"),
    localTime: format(zoned, "HH:mm"),
  };
}
