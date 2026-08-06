"use client";

/**
 * Appointment Notifications Section — Milestone 6.12.
 *
 * Displays notification history for an appointment on the detail page.
 * Shows event type, masked recipient, status, attempt count, and timestamps.
 * Provides retry action for failed notifications (owner/admin only).
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
import { retryNotificationAction } from "../actions/retry-notification-action";
import type { NotificationOutboxListItem, NotificationOutboxStatus } from "../types/notification";

const STATUS_COLORS: Record<NotificationOutboxStatus, "default" | "primary" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  processing: "info",
  sent: "success",
  failed: "error",
  cancelled: "default",
};

const STATUS_LABELS: Record<NotificationOutboxStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  sent: "Sent",
  failed: "Failed",
  cancelled: "Cancelled",
};

const EVENT_LABELS: Record<string, string> = {
  appointment_created: "Confirmation",
  appointment_rescheduled: "Rescheduled",
  appointment_cancelled: "Cancellation",
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
  notifications: NotificationOutboxListItem[];
  canRetry: boolean;
};

export default function AppointmentNotificationsSection({
  tenantSlug,
  notifications,
  canRetry,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = (outboxId: string) => {
    setRetryingId(outboxId);
    setFeedback(null);
    startTransition(async () => {
      const result = await retryNotificationAction(tenantSlug, outboxId);
      if (result.success) {
        setFeedback({ type: "success", message: "Notification queued for retry." });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
      setRetryingId(null);
    });
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Notifications
      </Typography>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Recipient</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Attempts</TableCell>
              <TableCell>Sent/Created</TableCell>
              {canRetry && <TableCell>Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <Typography variant="body2">
                    {EVENT_LABELS[notification.eventType] ?? notification.eventType}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {maskEmailForDisplay(notification.recipientEmail)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={STATUS_LABELS[notification.status]}
                    color={STATUS_COLORS[notification.status]}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{notification.attemptCount}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatTimestamp(notification.processedAt ?? notification.createdAt)}
                  </Typography>
                </TableCell>
                {canRetry && (
                  <TableCell>
                    {notification.status === "failed" && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleRetry(notification.id)}
                        disabled={isPending && retryingId === notification.id}
                      >
                        Retry
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {notifications.some((n) => n.status === "failed" && n.lastErrorMessage) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last error:{" "}
            {notifications.find((n) => n.status === "failed")?.lastErrorMessage}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

/**
 * Partially masks email for display. Shows first char + domain.
 */
function maskEmailForDisplay(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}
