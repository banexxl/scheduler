"use client";

/**
 * Booking Details Card — Milestone 18.0.
 *
 * Full booking display with status badge, details, and actions.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/types/appointment";
import BookingStatusTimeline from "./BookingStatusTimeline";
import DownloadCalendarButton from "./DownloadCalendarButton";
import type { BookingDetails } from "../types";

type Props = {
  booking: BookingDetails;
  tenantSlug: string;
};

const STATUS_COLORS: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  confirmed: "success",
  pending: "info",
  checked_in: "info",
  in_progress: "info",
  completed: "default",
  cancelled: "error",
  no_show: "warning",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function BookingDetailsCard({ booking, tenantSlug }: Props) {
  const price = parseFloat(booking.price);
  const statusLabel = APPOINTMENT_STATUS_LABELS[booking.status] ?? booking.status;
  const statusColor = STATUS_COLORS[booking.status] ?? "default";
  const isCancelled = booking.status === "cancelled";

  return (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Booking Details
        </Typography>
        <Paper variant="outlined" sx={{ p: 1, display: "inline-block", mb: 1 }}>
          <Typography variant="caption" color="text.secondary">Reference</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{booking.reference}</Typography>
        </Paper>
        <Box>
          <Chip label={statusLabel} color={statusColor} size="small" />
        </Box>
      </Box>

      {/* Details */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack spacing={1.5}>
          <DetailRow label="Business" value={booking.tenantName} />
          <DetailRow label="Service" value={booking.service.name} />
          {booking.staff && <DetailRow label="Staff" value={booking.staff.name} />}
          <DetailRow label="Location" value={booking.location.name} />
          <Divider />
          <DetailRow label="Date & Time" value={formatDateTime(booking.startsAt)} />
          <DetailRow label="Ends" value={formatTime(booking.endsAt)} />
          <DetailRow label="Duration" value={`${booking.durationMinutes} min`} />
          {price > 0 && <DetailRow label="Price" value={`${booking.currency} ${booking.price}`} />}
          <Divider />
          <DetailRow label="Name" value={booking.customer.name} />
          {booking.customer.email && <DetailRow label="Email" value={booking.customer.email} />}
          {booking.customer.phone && <DetailRow label="Phone" value={booking.customer.phone} />}
          {booking.notes && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Notes</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{booking.notes}</Typography>
              </Box>
            </>
          )}
        </Stack>
      </Paper>

      {/* Status Timeline */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>Booking Status</Typography>
        <BookingStatusTimeline booking={booking} />
      </Paper>

      {/* Actions */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
        {!isCancelled && <DownloadCalendarButton booking={booking} />}
        <Button href={`/book/${tenantSlug}`} variant="outlined" sx={{ textTransform: "none" }}>
          Return to Home
        </Button>
      </Stack>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" sx={{ textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}
