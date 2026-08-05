import * as yup from "yup";
import {
  isValidTenantSlugFormat,
  isReservedTenantSlug,
} from "@/lib/tenants/validate-tenant-slug";
import { SUPPORTED_CURRENCY_CODES } from "../utils/supported-currencies";

/**
 * Yup schema for the business creation form.
 *
 * Validates:
 * - businessName: required, trimmed, 2–120 chars
 * - tenantSlug: required, trimmed, lowercase, valid format (shared utility), not reserved
 * - primaryLocationName: required, trimmed, 2–120 chars
 * - timezone: required, non-empty, IANA-like format
 * - currency: required, exactly 3 uppercase letters, must be supported
 */
export const createBusinessSchema = yup.object({
  businessName: yup
    .string()
    .required("Business name is required")
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(120, "Business name must be at most 120 characters"),

  tenantSlug: yup
    .string()
    .required("Business address is required")
    .trim()
    .lowercase()
    .test(
      "valid-format",
      "Must start with a letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens (3–63 chars, no repeated hyphens)",
      (value) => !value || isValidTenantSlugFormat(value)
    )
    .test(
      "not-reserved",
      "This address is reserved. Choose another one.",
      (value) => !value || !isReservedTenantSlug(value)
    ),

  primaryLocationName: yup
    .string()
    .required("Location name is required")
    .trim()
    .min(2, "Location name must be at least 2 characters")
    .max(120, "Location name must be at most 120 characters"),

  timezone: yup
    .string()
    .required("Timezone is required")
    .min(1, "Timezone is required")
    .matches(
      /^[A-Za-z_]+\/[A-Za-z_/]+$/,
      "Must be a valid timezone identifier (e.g. Europe/Belgrade)"
    ),

  currency: yup
    .string()
    .required("Currency is required")
    .matches(/^[A-Z]{3}$/, "Currency must be a 3-letter code")
    .test(
      "supported-currency",
      "Currency is not supported",
      (value) => !value || SUPPORTED_CURRENCY_CODES.has(value)
    ),
});

export type CreateBusinessFormValues = yup.InferType<typeof createBusinessSchema>;
