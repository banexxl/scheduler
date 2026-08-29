"use client";

/**
 * Portal Access Form — Premium dark design with magic link.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requestPortalAccessAction } from "../actions/request-portal-access-action";

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

export default function PortalAccessForm({ tenantSlug, tenantName }: Props) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setResult(null);
    startTransition(async () => {
      const res = await requestPortalAccessAction(tenantSlug, { email: email.trim() });
      if (res.success) {
        setResult({ type: "success", message: res.message });
      } else {
        setResult({ type: "error", message: res.error });
      }
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
          Enter your email to view and manage your appointments.
        </Typography>

        {result && (
          <Alert
            severity={result.type}
            sx={{
              mb: 2,
              bgcolor: result.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              color: result.type === "success" ? "#10B981" : "#EF4444",
              border: `1px solid ${result.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
              "& .MuiAlert-icon": { color: result.type === "success" ? "#10B981" : "#EF4444" },
            }}
          >
            {result.message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoComplete="email"
            slotProps={{ htmlInput: { inputMode: "email" } }}
            sx={{ ...inputSx, mb: 2.5 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isPending || !email.trim()}
            sx={{
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
            {isPending ? "Sending..." : "Send sign-in link"}
          </Button>
        </Box>

        <Typography sx={{ display: "block", mt: 2, textAlign: "center", fontSize: "0.75rem", color: "#5c5c72" }}>
          We&apos;ll send a secure sign-in link to your email.
        </Typography>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
          <Button
            component="a"
            href={`/book/${tenantSlug}/login`}
            variant="text"
            size="small"
            sx={{ color: "#8b8b9e", textTransform: "none", fontSize: "0.8125rem", "&:hover": { color: "#a78bfa" } }}
          >
            Sign in with password
          </Button>
          <Typography sx={{ color: "#3a3a4a", lineHeight: "30px" }}>·</Typography>
          <Button
            component="a"
            href={`/book/${tenantSlug}`}
            variant="text"
            size="small"
            sx={{ color: "#5c5c72", textTransform: "none", fontSize: "0.8125rem", "&:hover": { color: "#8b8b9e" } }}
          >
            Back to booking
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
