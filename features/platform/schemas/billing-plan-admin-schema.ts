import * as yup from "yup";

export const billingPlanKeySchema = yup
     .string()
     .required("Plan key is required")
     .trim()
     .lowercase()
     .matches(/^[a-z][a-z0-9-]*$/, "Plan key must use lowercase letters, digits, and dashes")
     .min(2)
     .max(50);

export const billingPlanUpsertSchema = yup.object({
     id: yup.string().uuid().optional(),
     planKey: billingPlanKeySchema,
     name: yup.string().required("Name is required").trim().min(2).max(120),
     description: yup.string().trim().max(2000).nullable().default(null),
     isFree: yup.boolean().required(),
     isActive: yup.boolean().required(),
     isPublic: yup.boolean().required(),
     sortOrder: yup.number().integer().min(0).max(100000).required(),
     features: yup
          .array(yup.string().trim().min(1).max(200).required())
          .max(30)
          .default([]),
});

export const billingPlanReorderSchema = yup.object({
     orderedPlanIds: yup.array(yup.string().uuid().required()).min(1).required(),
});

export const productMappingSchema = yup.object({
     planId: yup.string().uuid().required("Plan id is required"),
     polarProductId: yup.string().uuid().nullable().default(null),
});

export const webhookRetrySchema = yup.object({
     eventId: yup.string().uuid().required("Event id is required"),
});

export const manualSyncSchema = yup.object({
     batchSize: yup.number().integer().min(1).max(50).optional(),
});
