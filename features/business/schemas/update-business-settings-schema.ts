import * as yup from "yup";
import { SUPPORTED_CURRENCY_CODES } from "../utils/supported-currencies";

const SUPPORTED_LANGUAGES = ["en", "sr", "ro"] as const;

const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
] as const;

/**
 * Validates an absolute HTTP or HTTPS URL.
 */
function isAbsoluteHttpUrl(value: string | null | undefined): boolean {
  if (!value) return true; // optional
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Schema for individual social link value.
 */
const socialLinkSchema = yup
  .string()
  .optional()
  .transform((val: unknown) => {
    if (typeof val !== "string") return undefined;
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  })
  .test(
    "valid-url",
    "Must be a valid HTTP or HTTPS URL",
    (value) => !value || isAbsoluteHttpUrl(value)
  )
  .max(500, "URL must be at most 500 characters");

/**
 * Yup schema for updating business settings.
 */
export const updateBusinessSettingsSchema = yup.object({
  name: yup
    .string()
    .required("Business name is required")
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(120, "Business name must be at most 120 characters"),

  contactEmail: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .email("Must be a valid email address")
    .max(254, "Email must be at most 254 characters"),

  contactPhone: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .max(40, "Phone number must be at most 40 characters"),

  defaultTimezone: yup
    .string()
    .required("Timezone is required")
    .min(1, "Timezone is required")
    .matches(
      /^[A-Za-z_]+\/[A-Za-z_/]+$/,
      "Must be a valid timezone identifier (e.g. Europe/Belgrade)"
    ),

  defaultCurrency: yup
    .string()
    .required("Currency is required")
    .matches(/^[A-Z]{3}$/, "Currency must be a 3-letter code")
    .test(
      "supported-currency",
      "Currency is not supported",
      (value) => !value || SUPPORTED_CURRENCY_CODES.has(value)
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

  websiteUrl: yup
    .string()
    .optional()
    .transform((val: unknown) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    })
    .test(
      "valid-http-url",
      "Must be a valid HTTP or HTTPS URL",
      (value) => !value || isAbsoluteHttpUrl(value)
    )
    .max(500, "URL must be at most 500 characters"),

  defaultLanguage: yup
    .string()
    .required("Language is required")
    .oneOf(
      SUPPORTED_LANGUAGES as unknown as string[],
      "Language must be one of: English, Serbian, Romanian"
    ),

  socialLinks: yup.object({
    facebook: socialLinkSchema,
    instagram: socialLinkSchema,
    linkedin: socialLinkSchema,
    tiktok: socialLinkSchema,
    youtube: socialLinkSchema,
  }),
});

export type UpdateBusinessSettingsFormValues = yup.InferType<
  typeof updateBusinessSettingsSchema
>;

export { SUPPORTED_LANGUAGES, SOCIAL_PLATFORMS };
