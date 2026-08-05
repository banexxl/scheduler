"use client";

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import {
  updatePasswordSchema,
  type UpdatePasswordFormValues,
} from "../schemas/update-password-schema";
import { updatePasswordAction } from "../actions/update-password";
import AuthFormAlert from "./auth-form-alert";
import type { AuthActionResult } from "../types/auth-action-result";

export default function UpdatePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<AuthActionResult | null>(
    null
  );

  const handleSubmit = (
    values: UpdatePasswordFormValues,
    { setFieldValue }: { setFieldValue: (field: string, value: string) => void }
  ) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    startTransition(async () => {
      const result = await updatePasswordAction(formData);
      setActionResult(result);
      if (!result.success) {
        setFieldValue("password", "");
        setFieldValue("confirmPassword", "");
      }
    });
  };

  return (
    <Formik<UpdatePasswordFormValues>
      initialValues={{ password: "", confirmPassword: "" }}
      validationSchema={updatePasswordSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched }) => (
        <Box component={Form} noValidate>
          <AuthFormAlert
            message={actionResult?.message}
            severity={actionResult?.success ? "success" : "error"}
          />

          <Field name="password">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="New Password"
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
                label="Confirm New Password"
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
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </Box>
      )}
    </Formik>
  );
}
