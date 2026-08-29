"use client";

/**
 * Customer Login Form — Premium dark design.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import { customerLoginAction } from "../actions/customer-login-action";
import { customerGoogleLoginAction } from "../actions/customer-google-login-action";
import type { AuthActionResult } from "@/features/auth/types/auth-action-result";

type Props = {
  tenantSlug: string;
  tenantName: string;
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "rgba(255,255,255,0.03)",
    borderRadius: 2,
    "& fieldset": { borderColor: "rgba(255,255,255,0.08)" },
    "&:hover fieldset": { borderColor: "rgba(124,58,237,0.3)" },
    "&.Mui-focused fieldset": { borderColor: "#7C3AED" },
  },
  "& .MuiInputLabel-root": { color: "#5c5c72" },
  "& .MuiOutlinedInput-input": { color: "#f0f0f5" },
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
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", p: 3 }}>
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          maxWidth: 420,
          width: "100%",
          borderRadius: 3,
          bgcolor: "rgba(22, 22, 30, 0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)",
          },
        }}
      >
        {/* Icon */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/getslot_icon.svg" alt="" width={52} height={52} style={{ filter: "drop-shadow(0 0 16px rgba(124,58,237,0.4))" }} />
        </Box>

        <Typography sx={{ fontSize: "1.375rem", fontWeight: 700, textAlign: "center", color: "#f0f0f5", mb: 0.5 }}>
          {tenantName}
        </Typography>
        <Typography sx={{ fontSize: "0.875rem", textAlign: "center", color: "#8b8b9e", mb: 3 }}>
          Sign in to manage your appointments and rewards.
        </Typography>

        {result?.message && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)", "& .MuiAlert-icon": { color: "#EF4444" } }}>
            {result.message}
          </Alert>
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
            sx={inputSx}
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
            sx={inputSx}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isPending}
            sx={{
              mt: 2.5,
              mb: 1.5,
              py: 1.5,
              fontWeight: 700,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.9375rem",
              background: "linear-gradient(135deg, #7C3AED, #a855f7)",
              boxShadow: "0 0 24px rgba(124,58,237,0.3)",
              "&:hover": { background: "linear-gradient(135deg, #6D28D9, #9333ea)", boxShadow: "0 0 36px rgba(124,58,237,0.5)" },
              "&.Mui-disabled": { background: "rgba(124,58,237,0.2)", color: "rgba(255,255,255,0.3)" },
            }}
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
                await customerGoogleLoginAction(tenantSlug);
              });
            }}
            sx={{
              mb: 2,
              py: 1.5,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.9375rem",
              borderColor: "rgba(255,255,255,0.1)",
              color: "#a0a0b8",
              "&:hover": { borderColor: "rgba(255,255,255,0.2)", color: "#f0f0f5", bgcolor: "rgba(255,255,255,0.03)" },
              "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" },
            }}
          >
            Continue with Google
          </Button>

          <Box sx={{ textAlign: "center" }}>
            <Link
              component="a"
              href={`/book/${tenantSlug}/register`}
              sx={{ fontSize: "0.8125rem", color: "#8b8b9e", textDecoration: "none", "&:hover": { color: "#a78bfa" } }}
            >
              Don&apos;t have an account? Create one
            </Link>
          </Box>

          <Button
            component="a"
            href={`/book/${tenantSlug}`}
            variant="text"
            size="small"
            fullWidth
            sx={{ mt: 1.5, color: "#5c5c72", textTransform: "none", "&:hover": { color: "#8b8b9e" } }}
          >
            Back to booking
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
