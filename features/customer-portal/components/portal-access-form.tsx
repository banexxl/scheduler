"use client";

/**
 * Portal Access Form — Supabase Auth Magic Link.
 *
 * Email input form that sends a Supabase Auth magic link.
 * On click, the user receives an email from Supabase with a
 * sign-in link. After clicking, they're redirected back to the portal.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requestPortalAccessAction } from "../actions/request-portal-access-action";

type Props = {
  tenantSlug: string;
  tenantName: string;
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
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, width: "100%", borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          {tenantName}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Enter your email to view and manage your appointments.
        </Typography>

        {result && (
          <Alert severity={result.type} sx={{ mb: 2 }}>
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
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isPending || !email.trim()}
          >
            {isPending ? "Sending..." : "Send sign-in link"}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
          We&apos;ll send a secure sign-in link to your email.
        </Typography>

        <Button
          component="a"
          href={`/book/${tenantSlug}`}
          variant="text"
          size="small"
          fullWidth
          sx={{ mt: 2 }}
        >
          Book a new appointment
        </Button>
      </Paper>
    </Box>
  );
}
