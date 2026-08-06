import * as yup from "yup";
import { periodsOverlap } from "@/lib/scheduling/scheduling-constants";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Schema for a single business-hour period.
 */
const businessHourPeriodSchema = yup.object({
  dayOfWeek: yup
    .number()
    .required("Day of week is required")
    .integer()
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

export type BusinessHourPeriodValues = yup.InferType<typeof businessHourPeriodSchema>;

/**
 * Validates the full weekly business-hours schedule for a location.
 */
export const setLocationBusinessHoursSchema = yup.object({
  locationId: yup
    .string()
    .required("Location ID is required")
    .matches(UUID_REGEX, "Invalid location ID format"),
  periods: yup
    .array()
    .of(businessHourPeriodSchema)
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
      "Schedule contains overlapping active periods for the same day",
      (value) => {
        if (!value) return true;
        const active = value.filter((p) => p.isActive !== false);
        for (let i = 0; i < active.length; i++) {
          for (let j = i + 1; j < active.length; j++) {
            const a = active[i]!;
            const b = active[j]!;
            if (a.dayOfWeek !== b.dayOfWeek) continue;
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
    ),
});

export type SetLocationBusinessHoursFormValues = yup.InferType<typeof setLocationBusinessHoursSchema>;
