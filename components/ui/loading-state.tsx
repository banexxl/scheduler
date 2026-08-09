"use client";

/**
 * Loading State — Milestone 10.4.
 *
 * Consistent loading indicator for async operations.
 * Supports skeleton mode (for lists) and spinner mode (for actions).
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type LoadingStateProps = {
  /** Display mode: skeleton for lists/cards, spinner for inline actions */
  mode?: "skeleton" | "spinner";
  /** Optional loading message */
  message?: string;
  /** Number of skeleton rows to display */
  rows?: number;
};

export default function LoadingState({
  mode = "spinner",
  message,
  rows = 3,
}: LoadingStateProps) {
  if (mode === "skeleton") {
    return (
      <Stack spacing={1.5} role="status" aria-label="Loading content">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={48} />
        ))}
      </Stack>
    );
  }

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}
      role="status"
      aria-label={message ?? "Loading"}
    >
      <CircularProgress size={32} />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
