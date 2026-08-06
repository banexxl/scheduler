"use client";

/**
 * Appointment edit form component — Milestone 6.9.
 *
 * Edits customer details and notes. Does not change time or status.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";
import { updateAppointmentAction } from "../actions/update-appointment-action";

type Props = {
  tenantSlug: string;
  appointmentId: string;
  initialValues: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    internalNotes: string;
    customerNotes: string;
  };
};

export default function AppointmentEditForm({
  tenantSlug,
  appointmentId,
  initialValues,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState(initialValues.customerName);
  const [customerEmail, setCustomerEmail] = useState(initialValues.customerEmail);
  const [customerPhone, setCustomerPhone] = useState(initialValues.customerPhone);
  const [internalNotes, setInternalNotes] = useState(initialValues.internalNotes);
  const [customerNotes, setCustomerNotes] = useState(initialValues.customerNotes);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    const result = await updateAppointmentAction(tenantSlug, appointmentId, {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || null,
      customerPhone: customerPhone.trim() || null,
      internalNotes: internalNotes.trim() || null,
      customerNotes: customerNotes.trim() || null,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    startTransition(() => router.refresh());
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Appointment updated successfully.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <TextField
          label="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          fullWidth
          inputProps={{ maxLength: 160 }}
        />
        <TextField
          label="Customer Email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          fullWidth
        />
        <TextField
          label="Customer Phone"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          fullWidth
        />
        <TextField
          label="Internal Notes"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          fullWidth
          multiline
          rows={3}
          inputProps={{ maxLength: 5000 }}
          helperText="Visible only to staff"
        />
        <TextField
          label="Customer Notes"
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
          inputProps={{ maxLength: 2000 }}
        />

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            onClick={() => startTransition(() => router.back())}
            disabled={submitting || isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || isPending || !customerName.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : "Save Changes"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
