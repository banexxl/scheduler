"use client";

/**
 * Booking Link Preview — Milestone 8.5.
 *
 * Shows the public booking URL with copy-to-clipboard and open-in-new-tab actions.
 * Used on the public booking settings page.
 */

import { useState } from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";

type Props = {
  tenantSlug: string;
  isEnabled: boolean;
};

export default function BookingLinkPreview({ tenantSlug, isEnabled }: Props) {
  const [copied, setCopied] = useState(false);

  const bookingPath = `/book/${tenantSlug}`;
  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${bookingPath}`
    : bookingPath;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text field
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 3 }}>
      <Typography variant="subtitle2" gutterBottom>Booking Link</Typography>

      {!isEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Public booking is disabled. Enable it above to allow customers to use this link.
        </Alert>
      )}

      <TextField
        value={fullUrl}
        fullWidth
        size="small"
        slotProps={{ input: { readOnly: true } }}
        sx={{ mb: 1.5, "& input": { fontFamily: "monospace", fontSize: "0.85rem" } }}
      />

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button
          size="small"
          variant="outlined"
          component="a"
          href={bookingPath}
          target="_blank"
          rel="noopener"
        >
          Preview booking page
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Share this link on your website, social profiles, or messaging to let customers book online.
      </Typography>
    </Paper>
  );
}
