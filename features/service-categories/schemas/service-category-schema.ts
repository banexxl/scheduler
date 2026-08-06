import * as yup from "yup";

export const serviceCategorySchema = yup.object({
  name: yup.string().required("Name is required").trim()
    .min(2, "Name must be at least 2 characters").max(120, "Name must be at most 120 characters"),
  slug: yup.string().required("Slug is required").trim().lowercase()
    .min(2, "Slug must be at least 2 characters").max(63, "Slug must be at most 63 characters")
    .matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, "Must start with a letter, end with letter/number, lowercase letters/numbers/hyphens only")
    .test("no-repeated-hyphens", "No repeated hyphens", (v) => !v || !v.includes("--")),
  description: yup.string().optional()
    .transform((v: unknown) => { if (typeof v !== "string") return undefined; const t = v.trim(); return t === "" ? undefined : t; })
    .max(1000, "Description must be at most 1,000 characters"),
  isActive: yup.boolean().required().default(true),
});

export type ServiceCategoryFormValues = yup.InferType<typeof serviceCategorySchema>;
