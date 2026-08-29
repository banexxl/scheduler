"use client";

/**
 * Customer Login Form — Tenant-scoped.
 *
 * Email + password sign-in. After login, redirects to the portal.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import { customerLoginAction } from "../actions/customer-login-action";
import type { AuthActionResult } from "@/features/auth/types/auth-action-result";

type Props = {
  tenantSlug: string;
  tenantName: string;
};

export default function CustomerLoginForm({ tenantSlug, tenantName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await customerLoginAction(tenantSlug, formData);
      setResult(res);
    });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, width: "100%", borderRadius: 3 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Box sx={{ textAlign: "center", mb: 1.5 }}>
          <img src="/logos/getslot_icon.svg" alt="" width={48} height={48} style={{ filter: "drop-shadow(0 0 12px rgba(124,58,237,0.3))" }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          {tenantName}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Sign in to manage your appointments and view your rewards.
        </Typography>

        {result?.message && (
          <Alert severity="error" sx={{ mb: 2 }}>{result.message}</Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            fullWidth
            required
            margin="normal"
            error={!!result?.fieldErrors?.email}
            helperText={result?.fieldErrors?.email}
            disabled={isPending}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            fullWidth
            required
            margin="normal"
            error={!!result?.fieldErrors?.password}
            helperText={result?.fieldErrors?.password}
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

          <Box sx={{ textAlign: "center" }}>
            <Link component="a" href={`/book/${tenantSlug}/register`} variant="body2">
              Don&apos;t have an account? Create one
            </Link>
          </Box>

          <Button
            component="a"
            href={`/book/${tenantSlug}`}
            variant="text"
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          >
            Back to booking
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
