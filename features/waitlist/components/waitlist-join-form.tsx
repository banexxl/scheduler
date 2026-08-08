"use client";

/**
 * Public Waitlist Join Form — Milestone 8.8.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { joinWaitlistAction } from "../actions/join-waitlist-action";

type Props = {
  tenantSlug: string;
  serviceId: string;
  serviceName: string;
  locationId: string;
  locationName: string;
  onBack?: () => void;
};

export default function WaitlistJoinForm({
  tenantSlug,
  serviceId,
  serviceName,
  locationId,
  locationName,
  onBack,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dateFrom || !dateTo) return;

    setResult(null);
    startTransition(async () => {
      const res = await joinWaitlistAction(tenantSlug, {
        serviceId,
        locationId,
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        preferredDateFrom: dateFrom,
        preferredDateTo: dateTo,
        allowAnyResource: true,
      });

      if (res.success) {
        setResult({
          type: "success",
          message: res.isExisting
            ? "You're already on the waitlist for this service. We'll notify you when a time opens up."
            : "You're on the waitlist! We'll let you know if a matching time becomes available.",
        });
      } else {
        setResult({ type: "error", message: res.error });
      }
    });
  }

  if (result?.type === "success") {
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>{result.message}</Alert>
        {onBack && <Button onClick={onBack} variant="text">Back</Button>}
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" component="h2" gutterBottom>
        Join Waitlist
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        No times available for <strong>{serviceName}</strong> at <strong>{locationName}</strong>?
        Join our waitlist and we&apos;ll notify you when a slot opens up.
      </Typography>

      {result?.type === "error" && <Alert severity="error" sx={{ mb: 2 }}>{result.message}</Alert>}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          size="small"
          autoComplete="name"
          slotProps={{ htmlInput: { maxLength: 160 } }}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          size="small"
          autoComplete="email"
          slotProps={{ htmlInput: { inputMode: "email" } }}
        />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        {onBack && <Button onClick={onBack} variant="text">Back</Button>}
        <Button type="submit" variant="contained" disabled={isPending || !name.trim() || !dateFrom || !dateTo}>
          {isPending ? "Joining..." : "Join Waitlist"}
        </Button>
      </Box>
    </Box>
  );
}
