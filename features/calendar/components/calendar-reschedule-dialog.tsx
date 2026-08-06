"use client";

/**
 * Calendar reschedule confirmation dialog — Milestone 6.10.
 *
 * Shows proposed new time after drag-and-drop and calls the
 * reschedule action on confirmation. Reverts UI on failure.
 */

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { rescheduleAppointmentAction } from "@/features/appointments/actions/reschedule-appointment-action";
import type { CalendarAppointment } from "../types/calendar";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
  appointment: CalendarAppointment | null;
  newLocalDate: string;
  newLocalStartTime: string;
  newResourceId: string;
  newResourceName: string;
};

export default function CalendarRescheduleDialog({
  open,
  onClose,
  onSuccess,
  tenantSlug,
  appointment,
  newLocalDate,
  newLocalStartTime,
  newResourceId,
  newResourceName,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!appointment) return null;

  const isSameResource = appointment.resourceId === newResourceId;

  async function handleConfirm() {
    if (!appointment) return;

    setSubmitting(true);
    setError("");

    const result = await rescheduleAppointmentAction(tenantSlug, appointment.id, {
      localDate: newLocalDate,
      localStartTime: newLocalStartTime,
      resourceId: !isSameResource ? newResourceId : undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSuccess();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reschedule Appointment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 2 }}>
          Move <strong>{appointment.appointmentNumber}</strong> ({appointment.customerName})?
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Current</Typography>
            <Typography variant="body2">
              {appointment.startsAt.slice(0, 10)} at {appointment.startsAt.slice(11, 16)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {appointment.resourceName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">New</Typography>
            <Typography variant="body2" fontWeight={600}>
              {newLocalDate} at {newLocalStartTime}
            </Typography>
            <Typography variant="body2" color={isSameResource ? "text.secondary" : "primary.main"}>
              {newResourceName}
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          Availability will be re-checked. If the time is no longer available, the move will be rejected.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={20} /> : "Confirm Move"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
