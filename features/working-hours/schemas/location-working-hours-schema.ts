import * as yup from "yup";

const daySchema = yup.object({
  dayOfWeek: yup.number().required().min(0).max(6),
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
}).test(
  "opens-before-closes",
  "Opening time must be before closing time",
  (value) => {
    if (value.isClosed) return true;
    if (!value.opensAt || !value.closesAt) return true;
    return value.opensAt < value.closesAt;
  }
);

/**
 * Yup schema for a full week of working hours (7 days).
 */
export const locationWorkingHoursSchema = yup.object({
  days: yup.array().of(daySchema).length(7, "Exactly 7 days required").required(),
});

export type LocationWorkingHoursFormValues = yup.InferType<typeof locationWorkingHoursSchema>;
