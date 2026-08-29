"use client";

/**
 * Cancel Booking Dialog — Milestone 18.1.
 *
 * Confirmation dialog with optional cancellation reason.
 */

import { useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { cancelBookingAction } from "../actions/modify-booking-actions";
import type { BookingDetails } from "../types";

type Props = {
  open: boolean;
  booking: BookingDetails;
  onClose: () => void;
  onCancelled: () => void;
};

export default function CancelBookingDialog({ open, booking, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction(booking, reason);
      if (result.success) {
        onCancelled();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cancel Booking</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Are you sure you want to cancel your appointment on{" "}
          {new Date(booking.startsAt).toLocaleDateString()}? This action cannot be undone.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          multiline
          rows={2}
          disabled={isPending}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText="Let the business know why you need to cancel"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isPending}>Keep Booking</Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Cancelling..." : "Cancel Booking"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
