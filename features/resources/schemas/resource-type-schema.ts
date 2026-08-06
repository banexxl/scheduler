import * as yup from "yup";
import { RESOURCE_KINDS } from "../types/resource";

export const resourceTypeSchema = yup.object({
  name: yup.string().required("Name is required").trim().min(1).max(120, "Name must be at most 120 characters"),
  slug: yup.string().required("Slug is required").trim().lowercase()
    .min(2, "Slug must be at least 2 characters").max(63, "Slug must be at most 63 characters")
    .matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, "Must start with a letter, end with a letter or number, lowercase letters/numbers/hyphens only")
    .test("no-repeated-hyphens", "No repeated hyphens", (v) => !v || !v.includes("--")),
  resourceKind: yup.string().required("Resource kind is required").oneOf(RESOURCE_KINDS as unknown as string[], "Invalid resource kind"),
  displayNameSingular: yup.string().required("Singular label is required").trim().min(1).max(120),
  displayNamePlural: yup.string().required("Plural label is required").trim().min(1).max(120),
  description: yup.string().optional().transform((v: unknown) => { if (typeof v !== "string") return undefined; const t = v.trim(); return t === "" ? undefined : t; }).max(2000),
  isActive: yup.boolean().required().default(true),
});

export type ResourceTypeFormValues = yup.InferType<typeof resourceTypeSchema>;
