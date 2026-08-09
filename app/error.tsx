"use client";

/**
 * Global Error Boundary — Milestone 10.3.
 *
 * Catches unexpected errors in the application shell.
 * Shows a customer-friendly fallback. Never exposes:
 * - Stack traces
 * - Database errors
 * - Internal error codes
 * - Provider details
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          An unexpected error occurred. Please try again or return to the
          homepage. If the problem persists, contact support.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <Button variant="contained" onClick={() => reset()}>
            Try Again
          </Button>
          <Button variant="outlined" component="a" href="/">
            Go Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
