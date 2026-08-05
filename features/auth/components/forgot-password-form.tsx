"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("email", data.email);

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
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <AuthFormAlert message={actionResult?.message} />

      <TextField
        {...register("email")}
        label="Email"
        type="email"
        autoComplete="email"
        fullWidth
        margin="normal"
        error={!!errors.email || !!actionResult?.fieldErrors?.email}
        helperText={
          errors.email?.message || actionResult?.fieldErrors?.email
        }
        disabled={isPending}
      />

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
  );
}
