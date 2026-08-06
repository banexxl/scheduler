import * as yup from "yup";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Schema for a single resource assignment input within a collection.
 *
 * Override semantics:
 * - null / undefined / empty string → no override (use service default)
 * - explicit 0 for price or buffers → valid zero override
 * - currency override requires a price override
 */
const resourceAssignmentInputSchema = yup.object({
  resourceId: yup
    .string()
    .required("Resource ID is required")
    .matches(UUID_REGEX, "Invalid resource ID format"),
  isActive: yup.boolean().optional().default(true),
  durationOverrideMinutes: yup
    .number()
    .nullable()
    .optional()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) return null;
      return value;
    })
    .test(
      "duration-range",
      "Duration override must be between 5 and 1440 minutes",
      (value) => value == null || (value >= 5 && value <= 1440)
    )
    .test(
      "duration-integer",
      "Duration override must be a whole number",
      (value) => value == null || Number.isInteger(value)
    ),
  priceOverride: yup
    .number()
    .nullable()
    .optional()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) return null;
      return value;
    })
    .test(
      "price-non-negative",
      "Price override cannot be negative",
      (value) => value == null || value >= 0
    ),
  currencyOverride: yup
    .string()
    .nullable()
    .optional()
    .transform((value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (trimmed === "") return null;
      return trimmed.toUpperCase();
    })
    .test(
      "currency-format",
      "Currency override must be exactly 3 uppercase letters",
      (value) => value == null || /^[A-Z]{3}$/.test(value)
    ),
  bufferBeforeOverrideMinutes: yup
    .number()
    .nullable()
    .optional()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) return null;
      return value;
    })
    .test(
      "buffer-before-range",
      "Buffer before override must be between 0 and 1440 minutes",
      (value) => value == null || (value >= 0 && value <= 1440)
    )
    .test(
      "buffer-before-integer",
      "Buffer before override must be a whole number",
      (value) => value == null || Number.isInteger(value)
    ),
  bufferAfterOverrideMinutes: yup
    .number()
    .nullable()
    .optional()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) return null;
      return value;
    })
    .test(
      "buffer-after-range",
      "Buffer after override must be between 0 and 1440 minutes",
      (value) => value == null || (value >= 0 && value <= 1440)
    )
    .test(
      "buffer-after-integer",
      "Buffer after override must be a whole number",
      (value) => value == null || Number.isInteger(value)
    ),
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

export type ResourceAssignmentInputValues = yup.InferType<typeof resourceAssignmentInputSchema>;

/**
 * Validates the full collection of resource assignments for a service.
 * Rejects duplicate resource IDs and validates currency-requires-price rule.
 */
export const setServiceResourcesSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service ID is required")
    .matches(UUID_REGEX, "Invalid service ID format"),
  assignments: yup
    .array()
    .of(resourceAssignmentInputSchema)
    .required("Assignments array is required")
    .default([])
    .test(
      "no-duplicate-resources",
      "Duplicate resource IDs are not allowed",
      (value) => {
        if (!value) return true;
        const ids = value.map((a) => a.resourceId).filter(Boolean);
        return new Set(ids).size === ids.length;
      }
    )
    .test(
      "currency-requires-price",
      "Currency override requires a price override",
      (value) => {
        if (!value) return true;
        return value.every(
          (a) => a.currencyOverride == null || a.priceOverride != null
        );
      }
    ),
});

export type SetServiceResourcesFormValues = yup.InferType<typeof setServiceResourcesSchema>;

/**
 * Validates input for reordering service-resource assignments.
 */
export const reorderServiceResourcesSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service ID is required")
    .matches(UUID_REGEX, "Invalid service ID format"),
  orderedAssignmentIds: yup
    .array()
    .of(
      yup
        .string()
        .required("Assignment ID is required")
        .matches(UUID_REGEX, "Invalid assignment ID format")
    )
    .required("Assignment IDs are required")
    .min(1, "At least one assignment ID is required")
    .test(
      "no-duplicates",
      "Duplicate assignment IDs are not allowed",
      (value) => {
        if (!value) return true;
        return new Set(value).size === value.length;
      }
    ),
});

export type ReorderServiceResourcesFormValues = yup.InferType<typeof reorderServiceResourcesSchema>;
