import * as yup from "yup";

export const platformSubscriptionListFilterSchema = yup.object({
     polarStatus: yup.string().trim().lowercase().optional(),
     accessState: yup.string().trim().lowercase().optional(),
     planId: yup.string().uuid().optional(),
     pastDueOnly: yup.boolean().optional(),
     scheduledCancellationOnly: yup.boolean().optional(),
     mappingIssueOnly: yup.boolean().optional(),
     staleOnly: yup.boolean().optional(),
     limit: yup.number().integer().min(1).max(200).optional(),
     cursor: yup.string().uuid().optional(),
});

export const platformSubscriptionDetailParamsSchema = yup.object({
     subscriptionId: yup.string().uuid().required("Subscription id is required"),
});

export const manualSubscriptionReconcileSchema = yup.object({
     subscriptionId: yup.string().uuid().optional(),
     tenantId: yup.string().uuid().optional(),
     polarCustomerId: yup.string().uuid().optional(),
     limit: yup.number().integer().min(1).max(200).optional(),
});

export const tenantSubscriptionRefreshSchema = yup.object({
     intent: yup.string().oneOf(["refresh"]).required(),
});

export const subscriptionBatchRequestSchema = yup.object({
     batchSize: yup.number().integer().min(1).max(200).optional(),
});
