import * as yup from "yup";

const LOCATION_TYPES = ["physical", "online", "customer_address"] as const;

/**
 * Canonical Yup schema for location create and edit.
 */
export const locationSchema = yup.object({
  name: yup
    .string()
    .required("Location name is required")
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be at most 120 characters"),

  slug: yup
    .string()
    .required("Location address is required")
    .trim()
    .lowercase()
    .min(2, "Address must be at least 2 characters")
    .max(63, "Address must be at most 63 characters")
    .matches(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      "Must start with a letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens"
    )
    .test(
      "no-repeated-hyphens",
      "Must not contain repeated hyphens",
      (value) => !value || !value.includes("--")
    ),

  locationType: yup
    .string()
    .required("Location type is required")
    .oneOf(
      LOCATION_TYPES as unknown as string[],
      "Must be Physical location, Online, or Customer's address"
    ),

  description: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(2000, "Description must be at most 2,000 characters"),

  streetAddress: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(255, "Street address must be at most 255 characters"),

  city: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(120, "City must be at most 120 characters"),

  provinceState: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(120, "Province/state must be at most 120 characters"),

  country: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(120, "Country must be at most 120 characters"),

  postalCode: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(20, "Postal code must be at most 20 characters"),

  phoneNumber: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(40, "Phone number must be at most 40 characters"),

  email: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .email("Must be a valid email address")
    .max(254, "Email must be at most 254 characters"),

  timezone: yup
    .string()
    .required("Timezone is required")
    .matches(
      /^[A-Za-z_]+\/[A-Za-z_/]+$/,
      "Must be a valid timezone identifier"
    ),

  isActive: yup.boolean().required().default(true),
});

export type LocationFormValues = yup.InferType<typeof locationSchema>;

export { LOCATION_TYPES };
