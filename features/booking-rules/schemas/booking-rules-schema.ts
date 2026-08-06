/**
 * Validation schemas for booking rules — Milestone 6.8.
 *
 * Two schemas:
 * 1. tenantBookingRulesSchema — all fields required (complete values)
 * 2. serviceBookingRulesSchema — all fields nullable (inherit from tenant)
 *
 * Key behaviors:
 * - Safely parses integer inputs
 * - Does NOT convert blank overrides to zero
 * - Preserves explicit zero
 * - Preserves explicit false
 * - Enforces boundary constraints
 * - Normalizes empty/undefined service override fields to null
 */

import * as yup from "yup";
import { BOOKING_RULE_BOUNDS } from "../types/booking-rules";

const { minimumNoticeMinutes, maximumAdvanceDays, slotIntervalMinutes, cancellationNoticeMinutes, rescheduleNoticeMinutes } = BOOKING_RULE_BOUNDS;

// ─── Tenant Booking Rules Schema ─────────────────────────────────────────────

export const tenantBookingRulesSchema = yup.object({
  minimumNoticeMinutes: yup
    .number()
    .required("Minimum booking notice is required")
    .integer("Must be a whole number")
    .min(minimumNoticeMinutes.min, `Minimum is ${minimumNoticeMinutes.min} minutes`)
    .max(minimumNoticeMinutes.max, `Maximum is ${minimumNoticeMinutes.max} minutes (365 days)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined ? undefined : value
    ),

  maximumAdvanceDays: yup
    .number()
    .required("Maximum advance booking is required")
    .integer("Must be a whole number")
    .min(maximumAdvanceDays.min, `Minimum is ${maximumAdvanceDays.min} day`)
    .max(maximumAdvanceDays.max, `Maximum is ${maximumAdvanceDays.max} days (2 years)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined ? undefined : value
    ),

  slotIntervalMinutes: yup
    .number()
    .required("Time-slot interval is required")
    .integer("Must be a whole number")
    .min(slotIntervalMinutes.min, `Minimum is ${slotIntervalMinutes.min} minutes`)
    .max(slotIntervalMinutes.max, `Maximum is ${slotIntervalMinutes.max} minutes`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined ? undefined : value
    ),

  cancellationNoticeMinutes: yup
    .number()
    .required("Customer cancellation notice is required")
    .integer("Must be a whole number")
    .min(cancellationNoticeMinutes.min, `Minimum is ${cancellationNoticeMinutes.min} minutes`)
    .max(cancellationNoticeMinutes.max, `Maximum is ${cancellationNoticeMinutes.max} minutes (365 days)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined ? undefined : value
    ),

  rescheduleNoticeMinutes: yup
    .number()
    .required("Customer rescheduling notice is required")
    .integer("Must be a whole number")
    .min(rescheduleNoticeMinutes.min, `Minimum is ${rescheduleNoticeMinutes.min} minutes`)
    .max(rescheduleNoticeMinutes.max, `Maximum is ${rescheduleNoticeMinutes.max} minutes (365 days)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined ? undefined : value
    ),

  allowSameDayBooking: yup.boolean().required("Same-day booking setting is required"),
  allowCustomerCancellation: yup.boolean().required("Customer cancellation setting is required"),
  allowCustomerRescheduling: yup.boolean().required("Customer rescheduling setting is required"),
  requireCustomerPhone: yup.boolean().required("Phone requirement setting is required"),
  requireCustomerEmail: yup.boolean().required("Email requirement setting is required"),
});

export type TenantBookingRulesFormValues = yup.InferType<typeof tenantBookingRulesSchema>;

// ─── Service Booking Rules Schema ────────────────────────────────────────────

/**
 * Service override schema. All fields are nullable.
 * - A null value means "inherit from tenant default".
 * - An explicit 0 or false is a valid override.
 * - Empty string inputs are normalized to null (not zero).
 */
export const serviceBookingRulesSchema = yup.object({
  minimumNoticeMinutes: yup
    .number()
    .nullable()
    .integer("Must be a whole number")
    .min(minimumNoticeMinutes.min, `Minimum is ${minimumNoticeMinutes.min} minutes`)
    .max(minimumNoticeMinutes.max, `Maximum is ${minimumNoticeMinutes.max} minutes (365 days)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined ? null : value
    )
    .default(null),

  maximumAdvanceDays: yup
    .number()
    .nullable()
    .integer("Must be a whole number")
    .min(maximumAdvanceDays.min, `Minimum is ${maximumAdvanceDays.min} day`)
    .max(maximumAdvanceDays.max, `Maximum is ${maximumAdvanceDays.max} days (2 years)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined ? null : value
    )
    .default(null),

  slotIntervalMinutes: yup
    .number()
    .nullable()
    .integer("Must be a whole number")
    .min(slotIntervalMinutes.min, `Minimum is ${slotIntervalMinutes.min} minutes`)
    .max(slotIntervalMinutes.max, `Maximum is ${slotIntervalMinutes.max} minutes`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined ? null : value
    )
    .default(null),

  cancellationNoticeMinutes: yup
    .number()
    .nullable()
    .integer("Must be a whole number")
    .min(cancellationNoticeMinutes.min, `Minimum is ${cancellationNoticeMinutes.min} minutes`)
    .max(cancellationNoticeMinutes.max, `Maximum is ${cancellationNoticeMinutes.max} minutes (365 days)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined ? null : value
    )
    .default(null),

  rescheduleNoticeMinutes: yup
    .number()
    .nullable()
    .integer("Must be a whole number")
    .min(rescheduleNoticeMinutes.min, `Minimum is ${rescheduleNoticeMinutes.min} minutes`)
    .max(rescheduleNoticeMinutes.max, `Maximum is ${rescheduleNoticeMinutes.max} minutes (365 days)`)
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined ? null : value
    )
    .default(null),

  allowSameDayBooking: yup
    .boolean()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined || originalValue === "inherit" ? null : value
    )
    .default(null),

  allowCustomerCancellation: yup
    .boolean()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined || originalValue === "inherit" ? null : value
    )
    .default(null),

  allowCustomerRescheduling: yup
    .boolean()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined || originalValue === "inherit" ? null : value
    )
    .default(null),

  requireCustomerPhone: yup
    .boolean()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined || originalValue === "inherit" ? null : value
    )
    .default(null),

  requireCustomerEmail: yup
    .boolean()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === undefined || originalValue === "inherit" ? null : value
    )
    .default(null),
});

export type ServiceBookingRulesFormValues = yup.InferType<typeof serviceBookingRulesSchema>;
