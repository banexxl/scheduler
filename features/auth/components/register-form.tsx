"use client";

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import {
  registerSchema,
  type RegisterFormValues,
} from "../schemas/register-schema";
import { registerAction } from "../actions/register";
import AuthFormAlert from "./auth-form-alert";
import PasswordField from "./password-field";
import type { AuthActionResult } from "../types/auth-action-result";

const authInputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#7C3AED",
  },
  "& .MuiInputLabel-shrink": {
    backgroundColor: "#16161e",
    paddingLeft: "6px",
    paddingRight: "6px",
  },
  "& .MuiOutlinedInput-input": { color: "#f0f0f5" },
};

export default function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<AuthActionResult | null>(
    null
  );

  const handleSubmit = (
    values: RegisterFormValues,
    { setFieldValue }: { setFieldValue: (field: string, value: string) => void }
  ) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    startTransition(async () => {
      const result = await registerAction(formData);
      setActionResult(result);
      if (!result.success) {
        toast.error(result.message ?? "Registration failed.");
        setFieldValue("password", "");
        setFieldValue("confirmPassword", "");
      } else {
        toast.success("Account created!");
      }
    });
  };

  if (actionResult?.success) {
    return (
      <AuthFormAlert message={actionResult.message} severity="success" />
    );
  }

  return (
    <Formik<RegisterFormValues>
      initialValues={{ email: "", password: "", confirmPassword: "" }}
      validationSchema={registerSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched }) => (
        <Box component={Form} noValidate>
          <AuthFormAlert message={actionResult?.message} />

          <Field name="email">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Email"
                type="email"
                autoComplete="email"
                fullWidth
                margin="normal"
                error={
                  (!!touched.email && !!errors.email) ||
                  !!actionResult?.fieldErrors?.email
                }
                helperText={
                  (touched.email && errors.email) ||
                  actionResult?.fieldErrors?.email
                }
                disabled={isPending}
                sx={authInputSx}
              />
            )}
          </Field>

          <Field name="password">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <PasswordField
                {...field}
                label="Password"
                autoComplete="new-password"
                error={
                  (!!touched.password && !!errors.password) ||
                  !!actionResult?.fieldErrors?.password
                }
                helperText={
                  (touched.password && errors.password) ||
                  actionResult?.fieldErrors?.password
                }
                disabled={isPending}
                sx={authInputSx}
              />
            )}
          </Field>

          <Field name="confirmPassword">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <PasswordField
                {...field}
                label="Confirm Password"
                autoComplete="new-password"
                error={
                  (!!touched.confirmPassword && !!errors.confirmPassword) ||
                  !!actionResult?.fieldErrors?.confirmPassword
                }
                helperText={
                  (touched.confirmPassword && errors.confirmPassword) ||
                  actionResult?.fieldErrors?.confirmPassword
                }
                disabled={isPending}
                sx={authInputSx}
              />
            )}
          </Field>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isPending}
            sx={{ mt: 2, mb: 1 }}
          >
            {isPending ? "Creating account..." : "Create Account"}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const { googleLoginAction } = await import("../actions/google-login");
                await googleLoginAction();
              });
            }}
            sx={{
              mb: 2,
              bgcolor: "#fff",
              color: "#3c4043",
              borderColor: "#dadce0",
              fontWeight: 500,
              textTransform: "none",
              "&:hover": { bgcolor: "#f7f8f8", borderColor: "#dadce0" },
              "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.12)", color: "rgba(0,0,0,0.26)", borderColor: "rgba(0,0,0,0.12)" },
            }}
            startIcon={
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <Box sx={{ textAlign: "center" }}>
            <Link component="a" href="/login" variant="body2">
              Already have an account? Sign in
            </Link>
          </Box>
        </Box>
      )}
    </Formik>
  );
}
