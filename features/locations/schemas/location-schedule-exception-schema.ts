import * as yup from "yup";
import { periodsOverlap } from "@/lib/scheduling/scheduling-constants";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Schema for a custom exception period.
 */
const exceptionPeriodSchema = yup.object({
  startTime: yup
    .string()
    .required("Start time is required")
    .matches(TIME_REGEX, "Start time must be in HH:mm format"),
  endTime: yup
    .string()
    .required("End time is required")
    .matches(TIME_REGEX, "End time must be in HH:mm format"),
  sortOrder: yup
    .number()
    .optional()
    .integer()
    .min(0)
    .default(0)
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) return 0;
      return value;
    }),
});

/**
 * Validates a location schedule exception (create or update).
 */
export const locationScheduleExceptionSchema = yup.object({
  locationId: yup
    .string()
    .required("Location ID is required")
    .matches(UUID_REGEX, "Invalid location ID format"),
  exceptionDate: yup
    .string()
    .required("Date is required")
    .matches(DATE_REGEX, "Date must be in YYYY-MM-DD format")
    .test("valid-date", "Invalid date", (value) => {
      if (!value) return true;
      const d = new Date(value + "T00:00:00");
      return !isNaN(d.getTime());
    }),
  exceptionType: yup
    .string()
    .required("Exception type is required")
    .oneOf(["closed", "custom_hours"], "Must be 'closed' or 'custom_hours'"),
  title: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .test("title-length", "Title must be between 1 and 120 characters", (value) =>
      value == null || (value.length >= 1 && value.length <= 120)
    ),
  notes: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .test("notes-length", "Notes must be at most 2000 characters", (value) =>
      value == null || value.length <= 2000
    ),
  isActive: yup.boolean().optional().default(true),
  periods: yup
    .array()
    .of(exceptionPeriodSchema)
    .required()
    .default([]),
}).test(
  "closed-no-periods",
  "Closed exceptions must not have custom periods",
  (values) => {
    if (values.exceptionType === "closed") {
      return !values.periods || values.periods.length === 0;
    }
    return true;
  }
).test(
  "custom-hours-has-periods",
  "Custom hours exceptions must have at least one period",
  (values) => {
    if (values.exceptionType === "custom_hours") {
      return values.periods != null && values.periods.length > 0;
    }
    return true;
  }
).test(
  "periods-start-before-end",
  "Start time must be before end time for all periods",
  (values) => {
    if (!values.periods) return true;
    return values.periods.every((p) => {
      if (!p.startTime || !p.endTime) return true;
      return p.startTime < p.endTime;
    });
  }
).test(
  "periods-no-overlap",
  "Custom periods contain overlapping time ranges",
  (values) => {
    if (!values.periods || values.periods.length < 2) return true;
    for (let i = 0; i < values.periods.length; i++) {
      for (let j = i + 1; j < values.periods.length; j++) {
        const a = values.periods[i]!;
        const b = values.periods[j]!;
        if (periodsOverlap(
          { startTime: a.startTime, endTime: a.endTime },
          { startTime: b.startTime, endTime: b.endTime }
        )) {
          return false;
        }
      }
    }
    return true;
  }
);

export type LocationScheduleExceptionFormValues = yup.InferType<typeof locationScheduleExceptionSchema>;
