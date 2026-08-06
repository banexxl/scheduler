import * as yup from "yup";

export const resourceSchema = yup.object({
  name: yup.string().required("Name is required").trim().min(1).max(120),
  slug: yup.string().required("Slug is required").trim().lowercase()
    .min(2, "Slug must be at least 2 characters").max(63, "Slug must be at most 63 characters")
    .matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, "Must start with a letter, end with letter/number, lowercase letters/numbers/hyphens only")
    .test("no-repeated-hyphens", "No repeated hyphens", (v) => !v || !v.includes("--")),
  resourceTypeId: yup.string().required("Resource type is required"),
  description: yup.string().optional().transform((v: unknown) => { if (typeof v !== "string") return undefined; const t = v.trim(); return t === "" ? undefined : t; }).max(2000),
  email: yup.string().optional().transform((v: unknown) => { if (typeof v !== "string") return undefined; const t = v.trim(); return t === "" ? undefined : t; }).email("Must be a valid email").max(254),
  phoneNumber: yup.string().optional().transform((v: unknown) => { if (typeof v !== "string") return undefined; const t = v.trim(); return t === "" ? undefined : t; }).max(40),
  isActive: yup.boolean().required().default(true),
  locationIds: yup.array().of(yup.string().required()).min(1, "At least one location is required").required(),
  primaryLocationId: yup.string().required("Primary location is required")
    .test("in-locations", "Primary location must be in assigned locations", function (value) {
      const { locationIds } = this.parent as { locationIds?: string[] };
      return !value || !locationIds || locationIds.includes(value);
    }),
});

export type ResourceFormValues = yup.InferType<typeof resourceSchema>;
