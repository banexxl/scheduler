/**
 * Validation schema for availability request input.
 *
 * Validates:
 * - Service ID (valid UUID)
 * - Location ID (valid UUID)
 * - Optional Resource ID (valid UUID when provided)
 * - Local date format (YYYY-MM-DD, valid calendar date)
 * - Slot interval (integer, 5–120)
 *
 * Does NOT validate:
 * - Ownership / tenant membership (resolved from database)
 * - Assignment eligibility (checked in orchestration)
 */

import * as yup from "yup";
import {
  SLOT_INTERVAL_MIN,
  SLOT_INTERVAL_MAX,
  SLOT_INTERVAL_DEFAULT,
} from "../types/availability";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a date string represents a real calendar date.
 * Rejects impossible dates like 2026-02-30.
 */
function isValidCalendarDate(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Basic range checks
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Create date and verify it round-trips
  // Use UTC to avoid timezone shifting the date
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const availabilityRequestSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service ID is required")
    .matches(UUID_REGEX, "Service ID must be a valid UUID"),

  locationId: yup
    .string()
    .required("Location ID is required")
    .matches(UUID_REGEX, "Location ID must be a valid UUID"),

  resourceId: yup
    .string()
    .nullable()
    .optional()
    .test(
      "valid-uuid-if-present",
      "Resource ID must be a valid UUID",
      (value) => {
        if (value === null || value === undefined || value === "") return true;
        return UUID_REGEX.test(value);
      }
    ),

  localDate: yup
    .string()
    .required("Local date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Local date must be in YYYY-MM-DD format")
    .test(
      "valid-calendar-date",
      "Local date must be a valid calendar date",
      (value) => {
        if (!value) return false;
        return isValidCalendarDate(value);
      }
    ),

  slotIntervalMinutes: yup
    .number()
    .optional()
    .integer("Slot interval must be a whole number")
    .min(SLOT_INTERVAL_MIN, `Slot interval must be at least ${SLOT_INTERVAL_MIN} minutes`)
    .max(SLOT_INTERVAL_MAX, `Slot interval must be at most ${SLOT_INTERVAL_MAX} minutes`)
    .default(SLOT_INTERVAL_DEFAULT),
});

export type ValidatedAvailabilityRequest = yup.InferType<typeof availabilityRequestSchema>;
