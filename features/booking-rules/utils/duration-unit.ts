/**
 * Duration unit helpers for booking-rule notice fields.
 *
 * Notice values (minimum notice, cancellation notice, reschedule notice) are
 * stored in the database as minutes. The settings UI lets the user choose
 * between "minutes" and "days"; these helpers convert between the chosen unit
 * and the canonical minute value used for storage and downstream logic.
 */

export const DURATION_UNITS = ["minutes", "days"] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number];

const MINUTES_PER_DAY = 1440;

export function isDurationUnit(value: unknown): value is DurationUnit {
     return value === "minutes" || value === "days";
}

/** Convert a value expressed in the given unit to minutes. */
export function toMinutes(value: number, unit: DurationUnit): number {
     if (!Number.isFinite(value)) return 0;
     return unit === "days" ? Math.round(value * MINUTES_PER_DAY) : Math.round(value);
}

/**
 * Convert a stored minute value into the best display unit and value.
 *
 * Prefers days when the value is a whole number of days (and non-zero),
 * otherwise falls back to minutes. This keeps round-tripping stable for
 * day-based inputs while preserving exact minute inputs.
 */
export function fromMinutes(minutes: number): { value: number; unit: DurationUnit } {
     if (!Number.isFinite(minutes) || minutes <= 0) {
          return { value: minutes > 0 ? minutes : 0, unit: "minutes" };
     }
     if (minutes % MINUTES_PER_DAY === 0) {
          return { value: minutes / MINUTES_PER_DAY, unit: "days" };
     }
     return { value: minutes, unit: "minutes" };
}
