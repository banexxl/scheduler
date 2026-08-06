import * as yup from "yup";

/**
 * Yup schema for creating or editing a location schedule exception.
 */
export const locationScheduleExceptionSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be at most 120 characters"),

  exceptionDate: yup
    .string()
    .required("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),

  isClosed: yup.boolean().required(),

  opensAt: yup
    .string()
    .nullable()
    .defined()
    .when("isClosed", {
      is: false,
      then: (schema) =>
        schema
          .required("Opening time is required")
          .matches(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
      otherwise: (schema) => schema.nullable(),
    }),

  closesAt: yup
    .string()
    .nullable()
    .defined()
    .when("isClosed", {
      is: false,
      then: (schema) =>
        schema
          .required("Closing time is required")
          .matches(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
      otherwise: (schema) => schema.nullable(),
    }),

  notes: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(1000, "Notes must be at most 1,000 characters"),
}).test(
  "opens-before-closes",
  "Opening time must be before closing time",
  (value) => {
    if (value.isClosed) return true;
    if (!value.opensAt || !value.closesAt) return true;
    return value.opensAt < value.closesAt;
  }
);

export type ScheduleExceptionFormValues = yup.InferType<typeof locationScheduleExceptionSchema>;
