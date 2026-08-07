"use client";

/**
 * Appointment status actions component — Milestone 6.9.
 *
 * Shows available status transitions and cancel button based on current status.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { updateAppointmentStatusAction } from "../actions/update-status-action";
import { cancelAppointmentAction } from "../actions/cancel-appointment-action";
import {
  STATUS_TRANSITIONS,
  APPOINTMENT_STATUS_LABELS,
  isTerminalStatus,
} from "../types/appointment";
import type { AppointmentStatus } from "../types/appointment";

const OPERATIONAL_ACTIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["checked_in", "in_progress"],
  checked_in: ["in_progress"],
  in_progress: [],
  completed: [],
  cancelled: [],
  no_show: [],
};

type Props = {
  tenantSlug: string;
  appointmentId: string;
  currentStatus: AppointmentStatus;
};

export default function AppointmentStatusActions({
  tenantSlug,
  appointmentId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus].filter(
    (s) => s !== "cancelled"
  );
  const operationalTransitions = OPERATIONAL_ACTIONS[currentStatus].filter((s) =>
    allowedTransitions.includes(s as (typeof allowedTransitions)[number]) && s !== "cancelled"
  );
  const canCancel = !isTerminalStatus(currentStatus);

  async function handleStatusChange(targetStatus: AppointmentStatus) {
    setError("");
    const result = await updateAppointmentStatusAction(tenantSlug, appointmentId, {
      status: targetStatus,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleCancel() {
    setError("");
    const result = await cancelAppointmentAction(tenantSlug, appointmentId, {
      reason: cancelReason.trim() || null,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCancelDialogOpen(false);
    startTransition(() => router.refresh());
  }

  if (isTerminalStatus(currentStatus)) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Actions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {operationalTransitions.map((status) => (
          <Button
            key={status}
            variant="outlined"
            size="small"
            onClick={() => handleStatusChange(status)}
            disabled={isPending}
          >
            {status === "checked_in" ? "Check In" : status === "in_progress" ? "Start Service" : APPOINTMENT_STATUS_LABELS[status]}
          </Button>
        ))}
        {allowedTransitions.includes("completed") && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleStatusChange("completed")}
            disabled={isPending}
          >
            Complete
          </Button>
        )}
        {allowedTransitions.includes("no_show") && (
          <Button
            variant="outlined"
            size="small"
            color="warning"
            onClick={() => handleStatusChange("no_show")}
            disabled={isPending}
          >
            Mark No-show
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => setCancelDialogOpen(true)}
            disabled={isPending}
          >
            Cancel Appointment
          </Button>
        )}
      </Box>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </Typography>
          <TextField
            label="Cancellation Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Appointment</Button>
          <Button onClick={handleCancel} color="error" variant="contained" disabled={isPending}>
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
