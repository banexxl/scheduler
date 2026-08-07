"use client";

/**
 * Public Customer Step — Milestones 6.11, 8.5.
 *
 * Polished customer details form with:
 * - Autofill-compatible attributes (name, email, tel)
 * - Mobile keyboard types (email, tel)
 * - Inline validation on blur
 * - Privacy notice
 * - Required field indicators based on booking rules
 * - Clear continue/back actions
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

type Props = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  requireEmail?: boolean;
  requirePhone?: boolean;
};

function isValidEmail(email: string): boolean {
  if (!email) return true;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export default function PublicCustomerStep({
  customerName, customerEmail, customerPhone, customerNotes,
  onChangeName, onChangeEmail, onChangePhone, onChangeNotes,
  onSubmit, onBack,
  requireEmail = false,
  requirePhone = false,
}: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);

  const errors: Record<string, string> = {};
  if (!customerName.trim()) errors.name = "Name is required";
  if (requireEmail && !customerEmail.trim()) errors.email = "Email is required";
  if (customerEmail && !isValidEmail(customerEmail)) errors.email = "Enter a valid email";
  if (requirePhone && !customerPhone.trim()) errors.phone = "Phone is required";

  const hasErrors = Object.keys(errors).length > 0;

  function handleContinue() {
    setAttempted(true);
    if (!hasErrors) onSubmit();
  }

  function showError(field: string): boolean {
    return (touched[field] || attempted) && !!errors[field];
  }

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Your details
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <TextField
          label="Full Name"
          value={customerName}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          required
          fullWidth
          error={showError("name")}
          helperText={showError("name") ? errors.name : undefined}
          autoComplete="name"
          slotProps={{ htmlInput: { maxLength: 160 } }}
        />

        <TextField
          label={requireEmail ? "Email" : "Email (optional)"}
          type="email"
          value={customerEmail}
          onChange={(e) => onChangeEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          required={requireEmail}
          fullWidth
          error={showError("email")}
          helperText={showError("email") ? errors.email : undefined}
          autoComplete="email"
          slotProps={{ htmlInput: { inputMode: "email" } }}
        />

        <TextField
          label={requirePhone ? "Phone" : "Phone (optional)"}
          type="tel"
          value={customerPhone}
          onChange={(e) => onChangePhone(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          required={requirePhone}
          fullWidth
          error={showError("phone")}
          helperText={showError("phone") ? errors.phone : undefined}
          autoComplete="tel"
          slotProps={{ htmlInput: { inputMode: "tel" } }}
        />

        <TextField
          label="Notes (optional)"
          value={customerNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          helperText="Any special requests or information for your appointment"
        />
      </Box>

      {/* Privacy notice */}
      <Alert severity="info" variant="outlined" icon={false} sx={{ mt: 2.5 }}>
        <Typography variant="caption" color="text.secondary">
          Your contact details are used to manage this booking and send appointment updates.
        </Typography>
      </Alert>

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={onBack} variant="text">Back</Button>
        <Button onClick={handleContinue} variant="contained">
          Continue
        </Button>
      </Box>
    </Box>
  );
}
