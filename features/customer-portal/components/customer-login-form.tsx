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
    bgcolor: "#7C3AED",
    borderRadius: 2,
    "& fieldset": { borderColor: "rgba(255,255,255,0.08)" },
    "&:hover fieldset": { borderColor: "rgba(124,58,237,0.3)" },
    "&.Mui-focused fieldset": { borderColor: "#7C3AED" },
  },
  "& .MuiInputLabel-root": { color: "#5c5c72" },
  "& .MuiInputLabel-shrink": {
    backgroundColor: "#16161e",
    paddingLeft: "6px",
    paddingRight: "6px",
  },
  "& .MuiOutlinedInput-input": { color: "#f0f0f5" },
  // Prevent browser autofill from masking the custom background until edited
  "& input:-webkit-autofill": {
    WebkitBoxShadow: "0 0 0 1000px #7C3AED inset",
    WebkitTextFillColor: "#f0f0f5",
    caretColor: "#f0f0f5",
    transition: "background-color 5000s ease-in-out 0s",
  },
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
              fontWeight: 500,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.9375rem",
              bgcolor: "#fff",
              color: "#3c4043",
              borderColor: "#dadce0",
              "&:hover": { bgcolor: "#f7f8f8", borderColor: "#dadce0" },
              "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.12)", color: "rgba(0,0,0,0.26)", borderColor: "rgba(0,0,0,0.12)" },
            }}
            startIcon={
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            }
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
