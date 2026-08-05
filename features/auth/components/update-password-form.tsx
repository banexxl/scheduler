"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdatePasswordFormValues>({
    resolver: yupResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = (data: UpdatePasswordFormValues) => {
    setActionResult(null);
    const formData = new FormData();
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);

    startTransition(async () => {
      const result = await updatePasswordAction(formData);
      setActionResult(result);
      if (!result.success) {
        setValue("password", "");
        setValue("confirmPassword", "");
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
        {...register("password")}
        label="New Password"
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
        {...register("confirmPassword")}
        label="Confirm New Password"
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
        {isPending ? "Updating..." : "Update Password"}
      </Button>
    </Box>
  );
}
