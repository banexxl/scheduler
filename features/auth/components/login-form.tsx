"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";
import { loginAction } from "../actions/login";
import AuthFormAlert from "./auth-form-alert";
import type { AuthActionResult } from "../types/auth-action-result";

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<AuthActionResult | null>(
    null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormValues) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);

    startTransition(async () => {
      const result = await loginAction(formData);
      setActionResult(result);
      // Clear password on failure
      if (!result.success) {
        setValue("password", "");
      }
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <AuthFormAlert
        message={actionResult?.message}
        severity={actionResult?.success ? "success" : "error"}
      />

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

      <TextField
        {...register("password")}
        label="Password"
        type="password"
        autoComplete="current-password"
        fullWidth
        margin="normal"
        error={!!errors.password || !!actionResult?.fieldErrors?.password}
        helperText={
          errors.password?.message || actionResult?.fieldErrors?.password
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
        {isPending ? "Signing in..." : "Sign In"}
      </Button>

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Link component={NextLink} href="/forgot-password" variant="body2">
          Forgot password?
        </Link>
        <Link component={NextLink} href="/register" variant="body2">
          Create an account
        </Link>
      </Box>
    </Box>
  );
}
