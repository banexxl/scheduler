/**
 * Validation schemas for appointments — Milestone 6.9.
 *
 * Schemas for:
 * - Appointment creation
 * - Appointment editing (customer details + notes)
 * - Appointment rescheduling
 * - Appointment cancellation
 * - Appointment status update
 *
 * Key behaviors:
 * - Strict calendar-date validation (YYYY-MM-DD, real dates only)
 * - Strict HH:mm time validation
 * - UUID validation for entity references
 * - Empty optional values normalize to null
 * - Client never supplies price, duration, buffers, or occupied window
 * - Clear field-level errors
 */

import * as yup from "yup";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_SOURCES,
  MAX_INTERNAL_NOTES_LENGTH,
  MAX_CUSTOMER_NOTES_LENGTH,
  MAX_CANCELLATION_REASON_LENGTH,
  MAX_CUSTOMER_NAME_LENGTH,
  MIN_CUSTOMER_NAME_LENGTH,
  MAX_CUSTOMER_PHONE_LENGTH,
  MIN_CUSTOMER_PHONE_LENGTH,
} from "../types/appointment";

// ─── Shared Validators ───────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Normalizes empty/whitespace-only strings to null */
function emptyToNull(value: unknown, originalValue: unknown): unknown {
  if (typeof originalValue === "string" && originalValue.trim() === "") return null;
  return value;
}

// ─── Appointment Create Schema ───────────────────────────────────────────────

export const appointmentCreateSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service is required")
    .matches(UUID_REGEX, "Service ID must be a valid UUID"),

  locationId: yup
    .string()
    .required("Location is required")
    .matches(UUID_REGEX, "Location ID must be a valid UUID"),

  resourceId: yup
    .string()
    .required("Resource is required")
    .matches(UUID_REGEX, "Resource ID must be a valid UUID"),

  customerId: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .test(
      "valid-uuid-if-present",
      "Customer ID must be a valid UUID",
      (value) => !value || UUID_REGEX.test(value)
    ),

  customerName: yup
    .string()
    .required("Customer name is required")
    .trim()
    .min(MIN_CUSTOMER_NAME_LENGTH, `Name must be at least ${MIN_CUSTOMER_NAME_LENGTH} character`)
    .max(MAX_CUSTOMER_NAME_LENGTH, `Name must be at most ${MAX_CUSTOMER_NAME_LENGTH} characters`),

  customerEmail: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .test(
      "valid-email-if-present",
      "Must be a valid email address",
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
      `Phone must be between ${MIN_CUSTOMER_PHONE_LENGTH} and ${MAX_CUSTOMER_PHONE_LENGTH} characters`,
      (value) => {
        if (!value) return true;
        return value.length >= MIN_CUSTOMER_PHONE_LENGTH && value.length <= MAX_CUSTOMER_PHONE_LENGTH;
      }
    ),

  localDate: yup
    .string()
    .required("Date is required")
    .matches(DATE_REGEX, "Date must be in YYYY-MM-DD format")
    .test(
      "valid-calendar-date",
      "Must be a valid calendar date",
      (value) => !!value && isValidCalendarDate(value)
    ),

  localStartTime: yup
    .string()
    .required("Start time is required")
    .matches(TIME_REGEX, "Start time must be in HH:mm format"),

  status: yup
    .string()
    .optional()
    .oneOf([...APPOINTMENT_STATUSES], "Invalid appointment status")
    .default("confirmed"),

  source: yup
    .string()
    .optional()
    .oneOf([...APPOINTMENT_SOURCES], "Invalid appointment source")
    .default("internal"),

  internalNotes: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .max(MAX_INTERNAL_NOTES_LENGTH, `Internal notes must be at most ${MAX_INTERNAL_NOTES_LENGTH} characters`),

  customerNotes: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .max(MAX_CUSTOMER_NOTES_LENGTH, `Customer notes must be at most ${MAX_CUSTOMER_NOTES_LENGTH} characters`),
});

export type AppointmentCreateFormValues = yup.InferType<typeof appointmentCreateSchema>;

// ─── Appointment Edit Schema (customer details + notes) ──────────────────────

export const appointmentEditSchema = yup.object({
  customerName: yup
    .string()
    .required("Customer name is required")
    .trim()
    .min(MIN_CUSTOMER_NAME_LENGTH, `Name must be at least ${MIN_CUSTOMER_NAME_LENGTH} character`)
    .max(MAX_CUSTOMER_NAME_LENGTH, `Name must be at most ${MAX_CUSTOMER_NAME_LENGTH} characters`),

  customerEmail: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .test(
      "valid-email-if-present",
      "Must be a valid email address",
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
      `Phone must be between ${MIN_CUSTOMER_PHONE_LENGTH} and ${MAX_CUSTOMER_PHONE_LENGTH} characters`,
      (value) => {
        if (!value) return true;
        return value.length >= MIN_CUSTOMER_PHONE_LENGTH && value.length <= MAX_CUSTOMER_PHONE_LENGTH;
      }
    ),

  internalNotes: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .max(MAX_INTERNAL_NOTES_LENGTH, `Internal notes must be at most ${MAX_INTERNAL_NOTES_LENGTH} characters`),

  customerNotes: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .max(MAX_CUSTOMER_NOTES_LENGTH, `Customer notes must be at most ${MAX_CUSTOMER_NOTES_LENGTH} characters`),
});

export type AppointmentEditFormValues = yup.InferType<typeof appointmentEditSchema>;

// ─── Appointment Reschedule Schema ───────────────────────────────────────────

export const appointmentRescheduleSchema = yup.object({
  serviceId: yup
    .string()
    .optional()
    .test(
      "valid-uuid-if-present",
      "Service ID must be a valid UUID",
      (value) => !value || UUID_REGEX.test(value)
    ),

  locationId: yup
    .string()
    .optional()
    .test(
      "valid-uuid-if-present",
      "Location ID must be a valid UUID",
      (value) => !value || UUID_REGEX.test(value)
    ),

  resourceId: yup
    .string()
    .optional()
    .test(
      "valid-uuid-if-present",
      "Resource ID must be a valid UUID",
      (value) => !value || UUID_REGEX.test(value)
    ),

  localDate: yup
    .string()
    .required("Date is required")
    .matches(DATE_REGEX, "Date must be in YYYY-MM-DD format")
    .test(
      "valid-calendar-date",
      "Must be a valid calendar date",
      (value) => !!value && isValidCalendarDate(value)
    ),

  localStartTime: yup
    .string()
    .required("Start time is required")
    .matches(TIME_REGEX, "Start time must be in HH:mm format"),
});

export type AppointmentRescheduleFormValues = yup.InferType<typeof appointmentRescheduleSchema>;

// ─── Appointment Cancellation Schema ─────────────────────────────────────────

export const appointmentCancellationSchema = yup.object({
  reason: yup
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .max(
      MAX_CANCELLATION_REASON_LENGTH,
      `Cancellation reason must be at most ${MAX_CANCELLATION_REASON_LENGTH} characters`
    ),
});

export type AppointmentCancellationFormValues = yup.InferType<typeof appointmentCancellationSchema>;

// ─── Appointment Status Update Schema ────────────────────────────────────────

export const appointmentStatusUpdateSchema = yup.object({
  status: yup
    .string()
    .required("Status is required")
    .oneOf([...APPOINTMENT_STATUSES], "Invalid appointment status"),
});

export type AppointmentStatusUpdateFormValues = yup.InferType<typeof appointmentStatusUpdateSchema>;
