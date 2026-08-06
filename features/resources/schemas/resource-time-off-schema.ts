import * as yup from "yup";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates input for creating or updating a resource time-off entry.
 *
 * Form input uses dates and times separately for UX,
 * which the action converts to timestamptz before storing.
 */
export const resourceTimeOffSchema = yup.object({
  resourceId: yup
    .string()
    .required("Resource ID is required")
    .matches(UUID_REGEX, "Invalid resource ID format"),
  locationId: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .test(
      "uuid-format",
      "Invalid location ID format",
      (value) => value == null || UUID_REGEX.test(value)
    ),
  title: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .test(
      "title-length",
      "Title must be between 1 and 120 characters",
      (value) => value == null || (value.length >= 1 && value.length <= 120)
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
    .test(
      "notes-length",
      "Notes must be at most 2000 characters",
      (value) => value == null || value.length <= 2000
    ),
  isAllDay: yup.boolean().required("Full-day indicator is required").default(false),
  startDate: yup
    .string()
    .required("Start date is required")
    .matches(DATE_REGEX, "Start date must be in YYYY-MM-DD format")
    .test(
      "valid-date",
      "Invalid start date",
      (value) => {
        if (!value) return true;
        const d = new Date(value);
        return !isNaN(d.getTime());
      }
    ),
  endDate: yup
    .string()
    .required("End date is required")
    .matches(DATE_REGEX, "End date must be in YYYY-MM-DD format")
    .test(
      "valid-date",
      "Invalid end date",
      (value) => {
        if (!value) return true;
        const d = new Date(value);
        return !isNaN(d.getTime());
      }
    ),
  startTime: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .test(
      "time-format",
      "Start time must be in HH:mm format",
      (value) => value == null || TIME_REGEX.test(value)
    ),
  endTime: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .test(
      "time-format",
      "End time must be in HH:mm format",
      (value) => value == null || TIME_REGEX.test(value)
    ),
}).test(
  "end-after-start",
  "End date/time must be after start date/time",
  (values) => {
    if (!values.startDate || !values.endDate) return true;
    if (values.isAllDay) {
      // For all-day: end date must be >= start date
      return values.endDate >= values.startDate;
    }
    // For time-specific: compare full datetime
    if (values.startDate > values.endDate) return false;
    if (values.startDate === values.endDate && values.startTime && values.endTime) {
      return values.startTime < values.endTime;
    }
    return true;
  }
).test(
  "times-required-when-not-all-day",
  "Start time and end time are required when not a full-day entry",
  (values) => {
    if (values.isAllDay) return true;
    return !!values.startTime && !!values.endTime;
  }
);

export type ResourceTimeOffFormValues = yup.InferType<typeof resourceTimeOffSchema>;
