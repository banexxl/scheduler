"use client";

/**
 * Global Error Boundary — Milestones 10.3, 15.13.
 *
 * Catches unexpected errors in the application shell.
 * Shows a customer-friendly fallback with:
 * - Current user email (if authenticated)
 * - "Go Home" navigates to user's appropriate dashboard
 * Never exposes:
 * - Stack traces
 * - Database errors
 * - Internal error codes
 * - Provider details
 */

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { createClient } from "@/lib/supabase/browser";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    }).catch(() => { });
  }, []);

  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={2}
        sx={{ p: 4, maxWidth: 480, textAlign: "center", borderRadius: 3 }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          An unexpected error occurred. Please try again or return to your
          dashboard. If the problem persists, contact support.
        </Typography>

        {userEmail && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Signed in as: {userEmail}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <Button variant="contained" onClick={() => reset()}>
            Try Again
          </Button>
          <Button variant="outlined" component="a" href="/api/home">
            Go Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
