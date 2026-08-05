"use client";

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../schemas/forgot-password-schema";
import { forgotPasswordAction } from "../actions/forgot-password";
import AuthFormAlert from "./auth-form-alert";
import type { AuthActionResult } from "../types/auth-action-result";

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<AuthActionResult | null>(
    null
  );

  const handleSubmit = (values: ForgotPasswordFormValues) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("email", values.email);

    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      setActionResult(result);
    });
  };

  if (actionResult?.success) {
    return (
      <AuthFormAlert message={actionResult.message} severity="success" />
    );
  }

  return (
    <Formik<ForgotPasswordFormValues>
      initialValues={{ email: "" }}
      validationSchema={forgotPasswordSchema}
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

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isPending}
            sx={{ mt: 2, mb: 2 }}
          >
            {isPending ? "Sending..." : "Send Reset Link"}
          </Button>

          <Box sx={{ textAlign: "center" }}>
            <Link component={NextLink} href="/login" variant="body2">
              Back to sign in
            </Link>
          </Box>
        </Box>
      )}
    </Formik>
  );
}
