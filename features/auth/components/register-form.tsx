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

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);

    startTransition(async () => {
      const result = await registerAction(formData);
      setActionResult(result);
      if (!result.success) {
        setValue("password", "");
        setValue("confirmPassword", "");
      }
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
        {...registerField("email")}
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

      <TextField
        {...registerField("password")}
        label="Password"
        type="password"
        autoComplete="new-password"
        fullWidth
        margin="normal"
        error={!!errors.password || !!actionResult?.fieldErrors?.password}
        helperText={
          errors.password?.message || actionResult?.fieldErrors?.password
        }
        disabled={isPending}
      />

      <TextField
        {...registerField("confirmPassword")}
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        fullWidth
        margin="normal"
        error={
          !!errors.confirmPassword ||
          !!actionResult?.fieldErrors?.confirmPassword
        }
        helperText={
          errors.confirmPassword?.message ||
          actionResult?.fieldErrors?.confirmPassword
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
        {isPending ? "Creating account..." : "Create Account"}
      </Button>

      <Box sx={{ textAlign: "center" }}>
        <Link component={NextLink} href="/login" variant="body2">
          Already have an account? Sign in
        </Link>
      </Box>
    </Box>
  );
}
