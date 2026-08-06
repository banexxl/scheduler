import * as yup from "yup";

export const checkoutCreationSchema = yup.object({
     billingPlanPriceId: yup.string().uuid().required("Price id is required"),
     requestKey: yup.string().uuid().required("Request key must be a UUID"),
});

export const checkoutReturnQuerySchema = yup.object({
     checkoutSessionId: yup.string().uuid().optional(),
     requestKey: yup.string().uuid().optional(),
});

export const customerPortalSessionSchema = yup.object({
     intent: yup.string().oneOf(["open"]).required(),
});
