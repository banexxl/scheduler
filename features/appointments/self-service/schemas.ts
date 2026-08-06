import * as yup from "yup";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const UUID_REGEX =
     /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emptyToNull(value: unknown, originalValue: unknown): unknown {
     if (typeof originalValue === "string" && originalValue.trim() === "") return null;
     return value;
}

export const cancelByTokenSchema = yup.object({
     reason: yup
          .string()
          .nullable()
          .optional()
          .transform(emptyToNull)
          .max(500, "Cancellation reason must be at most 500 characters"),
     idempotencyKey: yup
          .string()
          .required("Idempotency key is required")
          .matches(UUID_REGEX, "Idempotency key must be a valid UUID"),
});

export const rescheduleByTokenSchema = yup.object({
     localDate: yup
          .string()
          .required("Date is required")
          .matches(DATE_REGEX, "Date must be in YYYY-MM-DD format"),
     localStartTime: yup
          .string()
          .required("Start time is required")
          .matches(TIME_REGEX, "Start time must be in HH:mm format"),
     resourceId: yup
          .string()
          .nullable()
          .optional()
          .transform(emptyToNull)
          .test("uuid-if-present", "Resource ID must be a valid UUID", (value) => !value || UUID_REGEX.test(value)),
     reviewedPrice: yup
          .string()
          .required("Reviewed price is required")
          .max(32, "Reviewed price is too long"),
     reviewedCurrency: yup
          .string()
          .required("Reviewed currency is required")
          .matches(/^[A-Z]{3}$/, "Reviewed currency must be a 3-letter code"),
     reviewedDurationMinutes: yup
          .number()
          .required("Reviewed duration is required")
          .integer("Reviewed duration must be an integer")
          .min(1)
          .max(1440),
     idempotencyKey: yup
          .string()
          .required("Idempotency key is required")
          .matches(UUID_REGEX, "Idempotency key must be a valid UUID"),
});

export const rescheduleAvailabilityByTokenSchema = yup.object({
     localDate: yup
          .string()
          .required("Date is required")
          .matches(DATE_REGEX, "Date must be in YYYY-MM-DD format"),
     resourceId: yup
          .string()
          .nullable()
          .optional()
          .transform(emptyToNull)
          .test("uuid-if-present", "Resource ID must be a valid UUID", (value) => !value || UUID_REGEX.test(value)),
});
