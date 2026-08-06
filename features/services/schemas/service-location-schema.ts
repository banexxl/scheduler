import * as yup from "yup";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates the input for setting all locations assigned to a service.
 * Accepts an empty array (removes all assignments).
 * Rejects malformed UUIDs and duplicate location IDs.
 */
export const setServiceLocationsSchema = yup.object({
  serviceId: yup
    .string()
    .required("Service ID is required")
    .matches(UUID_REGEX, "Invalid service ID format"),
  locationIds: yup
    .array()
    .of(
      yup
        .string()
        .required("Location ID is required")
        .matches(UUID_REGEX, "Invalid location ID format")
    )
    .required("Location IDs are required")
    .default([])
    .test(
      "no-duplicates",
      "Duplicate location IDs are not allowed",
      (value) => {
        if (!value) return true;
        return new Set(value).size === value.length;
      }
    ),
});

export type SetServiceLocationsFormValues = yup.InferType<typeof setServiceLocationsSchema>;

/**
 * Validates input for reordering service-location assignments within a location.
 */
export const reorderServiceLocationsSchema = yup.object({
  locationId: yup
    .string()
    .required("Location ID is required")
    .matches(UUID_REGEX, "Invalid location ID format"),
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

export type ReorderServiceLocationsFormValues = yup.InferType<typeof reorderServiceLocationsSchema>;
