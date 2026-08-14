"use client";

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";
import { loginAction } from "../actions/login";
import { googleLoginAction } from "../actions/google-login";
import AuthFormAlert from "./auth-form-alert";
import type { AuthActionResult } from "../types/auth-action-result";

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<AuthActionResult | null>(
    null
  );

  const handleSubmit = (
    values: LoginFormValues,
    { setFieldValue }: { setFieldValue: (field: string, value: string) => void }
  ) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await loginAction(formData);
      setActionResult(result);
      // Clear password on failure
      if (!result.success) {
        toast.error(result.message ?? "Login failed.");
        setFieldValue("password", "");
      }
    });
  };

  return (
    <Formik<LoginFormValues>
      initialValues={{ email: "", password: "" }}
      validationSchema={loginSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched }) => (
        <Box component={Form} noValidate>
          <AuthFormAlert
            message={actionResult?.message}
            severity={actionResult?.success ? "success" : "error"}
          />

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
              />
            )}
          </Field>

          <Field name="password">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                autoComplete="current-password"
                fullWidth
                margin="normal"
                error={
                  (!!touched.password && !!errors.password) ||
                  !!actionResult?.fieldErrors?.password
                }
                helperText={
                  (touched.password && errors.password) ||
                  actionResult?.fieldErrors?.password
                }
                disabled={isPending}
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
            {isPending ? "Signing in..." : "Sign In"}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await googleLoginAction();
              });
            }}
            sx={{ mb: 2 }}
          >
            Continue with Google
          </Button>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Link component="a" href="/forgot-password" variant="body2">
              Forgot password?
            </Link>
            <Link component="a" href="/register" variant="body2">
              Create an account
            </Link>
          </Box>
        </Box>
      )}
    </Formik>
  );
}
