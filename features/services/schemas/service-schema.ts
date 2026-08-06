import * as yup from "yup";
import { SUPPORTED_CURRENCY_CODES } from "@/features/business/utils/supported-currencies";

export const serviceSchema = yup.object({
  name: yup.string().required("Name is required").trim()
    .min(2, "Name must be at least 2 characters").max(120, "Name must be at most 120 characters"),
  slug: yup.string().required("Slug is required").trim().lowercase()
    .min(2, "Slug must be at least 2 characters").max(63, "Slug must be at most 63 characters")
    .matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, "Must start with a letter, end with letter/number, lowercase letters/numbers/hyphens only")
    .test("no-repeated-hyphens", "No repeated hyphens", (v) => !v || !v.includes("--")),
  serviceCategoryId: yup.string().nullable().optional()
    .transform((v: unknown) => { if (typeof v !== "string") return null; return v.trim() === "" ? null : v; }),
  description: yup.string().optional()
    .transform((v: unknown) => { if (typeof v !== "string") return undefined; const t = v.trim(); return t === "" ? undefined : t; })
    .max(2000, "Description must be at most 2,000 characters"),
  durationMinutes: yup.number().required("Duration is required")
    .min(5, "Minimum duration is 5 minutes").max(1440, "Maximum duration is 24 hours (1440 minutes)")
    .integer("Duration must be a whole number"),
  price: yup.number().required("Price is required")
    .min(0, "Price cannot be negative")
    .transform((value, originalValue) => (originalValue === "" || originalValue === null || originalValue === undefined) ? 0 : value),
  currency: yup.string().required("Currency is required")
    .matches(/^[A-Z]{3}$/, "Must be a 3-letter currency code")
    .test("supported", "Currency not supported", (v) => !v || SUPPORTED_CURRENCY_CODES.has(v)),
  bufferBeforeMinutes: yup.number().required()
    .min(0, "Buffer cannot be negative").max(1440, "Maximum 1440 minutes").integer().default(0)
    .transform((value, originalValue) => (originalValue === "" || originalValue === null || originalValue === undefined) ? 0 : value),
  bufferAfterMinutes: yup.number().required()
    .min(0, "Buffer cannot be negative").max(1440, "Maximum 1440 minutes").integer().default(0)
    .transform((value, originalValue) => (originalValue === "" || originalValue === null || originalValue === undefined) ? 0 : value),
  isActive: yup.boolean().required().default(true),
});

export type ServiceFormValues = yup.InferType<typeof serviceSchema>;
