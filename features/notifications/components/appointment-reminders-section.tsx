"use client";

/**
 * Appointment Reminders Section — Milestone 6.13.
 *
 * Displays reminder schedule history for an appointment on the detail page.
 * Shows rule name, scheduled time, status, and actions.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import { syncAppointmentRemindersAction } from "../actions/sync-reminders-action";
import {
  formatReminderOffset,
  type AppointmentReminderListItem,
  type ReminderStatus,
} from "../types/notification";

const STATUS_COLORS: Record<ReminderStatus, "default" | "primary" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  processing: "info",
  enqueued: "primary",
  sent: "success",
  cancelled: "default",
  failed: "error",
};

const STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  enqueued: "Enqueued",
  sent: "Sent",
  cancelled: "Cancelled",
  failed: "Failed",
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  tenantSlug: string;
  appointmentId: string;
  reminders: AppointmentReminderListItem[];
  canSync: boolean;
};

export default function AppointmentRemindersSection({
  tenantSlug,
  appointmentId,
  reminders,
  canSync,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSync = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await syncAppointmentRemindersAction(tenantSlug, appointmentId);
      if (result.success) {
        const data = result.data;
        if (data.status === "synced") {
          setFeedback({
            type: "success",
            message: `Reminders synced: ${data.createdOrUpdated} created/updated, ${data.cancelled} cancelled, ${data.skippedPast} skipped (past).`,
          });
        } else if (data.status === "ineligible") {
          setFeedback({ type: "success", message: `Appointment ineligible. ${data.cancelled} reminders cancelled.` });
        } else {
          setFeedback({ type: "success", message: `Sync result: ${data.status}` });
        }
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  };

  if (reminders.length === 0 && !canSync) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Reminders</Typography>
        {canSync && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleSync}
            disabled={isPending}
          >
            {isPending ? "Syncing..." : "Sync Reminders"}
          </Button>
        )}
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {reminders.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No reminders scheduled for this appointment.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rule</TableCell>
                <TableCell>Timing</TableCell>
                <TableCell>Scheduled For</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reminders.map((reminder) => (
                <TableRow key={reminder.id}>
                  <TableCell>
                    <Typography variant="body2">{reminder.ruleName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${formatReminderOffset(reminder.offsetMinutes)} before`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(reminder.scheduledFor)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[reminder.status]}
                      color={STATUS_COLORS[reminder.status]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(reminder.sentAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {reminders.some((r) => r.status === "cancelled" && r.cancellationReason) && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Cancelled: {reminders.find((r) => r.status === "cancelled")?.cancellationReason}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
