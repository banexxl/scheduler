import * as yup from "yup";

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Enter a valid email address"),
});

export type ForgotPasswordFormValues = yup.InferType<
  typeof forgotPasswordSchema
>;
