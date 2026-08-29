"use client";

/**
 * Customer Registration Form — Tenant-scoped.
 *
 * Collects name, email, phone, password. Creates Supabase Auth user
 * and links them to the tenant.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import { customerRegisterAction } from "../actions/customer-register-action";
import type { AuthActionResult } from "@/features/auth/types/auth-action-result";

type Props = {
  tenantSlug: string;
  tenantName: string;
};

export default function CustomerRegisterForm({ tenantSlug, tenantName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await customerRegisterAction(tenantSlug, formData);
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, width: "100%", borderRadius: 3, textAlign: "center" }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Account Created</Typography>
          <Alert severity="success" sx={{ mb: 2 }}>{result.message}</Alert>
          <Button
            component="a"
            href={`/book/${tenantSlug}/login`}
            variant="contained"
            fullWidth
          >
            Sign In
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, width: "100%", borderRadius: 3 }}>
        <Box sx={{ textAlign: "center", mb: 1.5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/getslot_icon.svg" alt="" width={48} height={48} style={{ filter: "drop-shadow(0 0 12px rgba(124,58,237,0.3))" }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          {tenantName}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Create an account to book appointments and manage your bookings.
        </Typography>

        {result?.message && (
          <Alert severity="error" sx={{ mb: 2 }}>{result.message}</Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            name="name"
            label="Full Name"
            autoComplete="name"
            fullWidth
            required
            margin="normal"
            error={!!result?.fieldErrors?.name}
            helperText={result?.fieldErrors?.name}
            disabled={isPending}
          />
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
            name="phone"
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            fullWidth
            margin="normal"
            disabled={isPending}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            required
            margin="normal"
            error={!!result?.fieldErrors?.password}
            helperText={result?.fieldErrors?.password}
            disabled={isPending}
          />
          <TextField
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            required
            margin="normal"
            error={!!result?.fieldErrors?.confirmPassword}
            helperText={result?.fieldErrors?.confirmPassword}
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
            <Link component="a" href={`/book/${tenantSlug}/login`} variant="body2">
              Already have an account? Sign in
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
