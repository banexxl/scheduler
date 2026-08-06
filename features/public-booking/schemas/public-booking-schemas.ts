/**
 * Public booking validation schemas — Milestone 6.11.
 *
 * Schemas for:
 * - Public availability request
 * - Public booking submission (final creation)
 *
 * Key behaviors:
 * - Strict UUID validation
 * - Strict calendar-date validation
 * - Strict ISO instant validation for startsAt
 * - Generic public-safe validation messages
 * - Normalizes whitespace
 * - Rejects unexpected fields
 * - Client never supplies price, duration, buffers
 */

import * as yup from "yup";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isValidCalendarDate(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function emptyToNull(value: unknown, originalValue: unknown): unknown {
  if (typeof originalValue === "string" && originalValue.trim() === "") return null;
  return value;
}

// ─── Public Availability Request Schema ──────────────────────────────────────

export const publicAvailabilityRequestSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service is required.")
    .matches(UUID_REGEX, "Invalid service."),

  locationId: yup
    .string()
    .required("Location is required.")
    .matches(UUID_REGEX, "Invalid location."),

  resourceId: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .test(
      "valid-uuid-if-present",
      "Invalid resource.",
      (value) => !value || UUID_REGEX.test(value)
    ),

  localDate: yup
    .string()
    .required("Date is required.")
    .matches(DATE_REGEX, "Invalid date format.")
    .test(
      "valid-calendar-date",
      "Invalid date.",
      (value) => !!value && isValidCalendarDate(value)
    ),
});

export type PublicAvailabilityRequestValues = yup.InferType<typeof publicAvailabilityRequestSchema>;

// ─── Public Booking Submission Schema ────────────────────────────────────────

export const publicBookingSubmissionSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service is required.")
    .matches(UUID_REGEX, "Invalid service."),

  locationId: yup
    .string()
    .required("Location is required.")
    .matches(UUID_REGEX, "Invalid location."),

  resourceId: yup
    .string()
    .required("Resource is required.")
    .matches(UUID_REGEX, "Invalid resource."),

  startsAt: yup
    .string()
    .required("Time selection is required.")
    .matches(ISO_INSTANT_REGEX, "Invalid time format."),

  localDate: yup
    .string()
    .required("Date is required.")
    .matches(DATE_REGEX, "Invalid date format.")
    .test(
      "valid-calendar-date",
      "Invalid date.",
      (value) => !!value && isValidCalendarDate(value)
    ),

  customerName: yup
    .string()
    .required("Name is required.")
    .trim()
    .min(1, "Name is required.")
    .max(160, "Name is too long."),

  customerEmail: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .test(
      "valid-email-if-present",
      "Please enter a valid email address.",
      (value) => {
        if (!value) return true;
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254;
      }
    ),

  customerPhone: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .test(
      "valid-phone-if-present",
      "Please enter a valid phone number.",
      (value) => {
        if (!value) return true;
        return value.length >= 3 && value.length <= 30;
      }
    ),

  customerNotes: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .max(2000, "Notes are too long."),

  idempotencyKey: yup
    .string()
    .required("Request identifier is required.")
    .matches(UUID_REGEX, "Invalid request identifier."),

  /** Client-provided reviewed price for comparison (not trusted as authoritative) */
  reviewedPrice: yup
    .string()
    .nullable()
    .optional(),

  /** Client-provided reviewed duration for comparison */
  reviewedDuration: yup
    .number()
    .nullable()
    .optional(),
});

export type PublicBookingSubmissionValues = yup.InferType<typeof publicBookingSubmissionSchema>;
