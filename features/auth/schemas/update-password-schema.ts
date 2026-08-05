import * as yup from "yup";

const passwordRules = yup
  .string()
  .required("Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .matches(/[a-z]/, "Password must contain at least one lowercase letter")
  .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
  .matches(/\d/, "Password must contain at least one number")
  .matches(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

export const updatePasswordSchema = yup.object({
  password: passwordRules,
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

export type UpdatePasswordFormValues = yup.InferType<
  typeof updatePasswordSchema
>;
