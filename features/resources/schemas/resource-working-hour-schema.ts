import * as yup from "yup";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Schema for a single working-hour period within a weekly schedule.
 */
const workingHourPeriodSchema = yup.object({
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
  dayOfWeek: yup
    .number()
    .required("Day of week is required")
    .integer("Day must be a whole number")
    .min(1, "Day must be between 1 (Monday) and 7 (Sunday)")
    .max(7, "Day must be between 1 (Monday) and 7 (Sunday)"),
  startTime: yup
    .string()
    .required("Start time is required")
    .matches(TIME_REGEX, "Start time must be in HH:mm format"),
  endTime: yup
    .string()
    .required("End time is required")
    .matches(TIME_REGEX, "End time must be in HH:mm format"),
  isActive: yup.boolean().optional().default(true),
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

export type WorkingHourPeriodValues = yup.InferType<typeof workingHourPeriodSchema>;

/**
 * Validates the full weekly schedule for a resource.
 * Checks time ordering, rejects overnight periods, and detects overlaps.
 */
export const setResourceWorkingHoursSchema = yup.object({
  resourceId: yup
    .string()
    .required("Resource ID is required")
    .matches(UUID_REGEX, "Invalid resource ID format"),
  periods: yup
    .array()
    .of(workingHourPeriodSchema)
    .required("Periods array is required")
    .default([])
    .test(
      "start-before-end",
      "Start time must be before end time for all periods",
      (value) => {
        if (!value) return true;
        return value.every((p) => {
          if (!p.startTime || !p.endTime) return true;
          return p.startTime < p.endTime;
        });
      }
    )
    .test(
      "no-overlapping-active",
      "Schedule contains overlapping active periods for the same day and location",
      (value) => {
        if (!value) return true;
        const active = value.filter((p) => p.isActive !== false);
        for (let i = 0; i < active.length; i++) {
          for (let j = i + 1; j < active.length; j++) {
            const a = active[i];
            const b = active[j];
            if (a.dayOfWeek !== b.dayOfWeek) continue;
            // Same location scope
            const sameLocation =
              (a.locationId == null && b.locationId == null) ||
              (a.locationId != null && a.locationId === b.locationId);
            if (!sameLocation) continue;
            // Check overlap
            if (a.startTime! < b.endTime! && a.endTime! > b.startTime!) {
              return false;
            }
          }
        }
        return true;
      }
    ),
});

export type SetResourceWorkingHoursFormValues = yup.InferType<typeof setResourceWorkingHoursSchema>;
