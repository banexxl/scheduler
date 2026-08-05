"use client";

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import {
  registerSchema,
  type RegisterFormValues,
} from "../schemas/register-schema";
import { registerAction } from "../actions/register";
import AuthFormAlert from "./auth-form-alert";
import type { AuthActionResult } from "../types/auth-action-result";

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
        setFieldValue("password", "");
        setFieldValue("confirmPassword", "");
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
              />
            )}
          </Field>

          <Field name="password">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                autoComplete="new-password"
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

          <Field name="confirmPassword">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                fullWidth
                margin="normal"
                error={
                  (!!touched.confirmPassword && !!errors.confirmPassword) ||
                  !!actionResult?.fieldErrors?.confirmPassword
                }
                helperText={
                  (touched.confirmPassword && errors.confirmPassword) ||
                  actionResult?.fieldErrors?.confirmPassword
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
            sx={{ mt: 2, mb: 2 }}
          >
            {isPending ? "Creating account..." : "Create Account"}
          </Button>

          <Box sx={{ textAlign: "center" }}>
            <Link component={NextLink} href="/login" variant="body2">
              Already have an account? Sign in
            </Link>
          </Box>
        </Box>
      )}
    </Formik>
  );
}
