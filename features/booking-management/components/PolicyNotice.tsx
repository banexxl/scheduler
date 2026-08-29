"use client";

/**
 * Policy Notice — Milestone 18.1.
 *
 * Displays a friendly explanation when an action is not available.
 */

import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

type Props = {
  reason: string;
};

export default function PolicyNotice({ reason }: Props) {
  return (
    <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
      <Typography variant="body2">{reason}</Typography>
    </Alert>
  );
}
