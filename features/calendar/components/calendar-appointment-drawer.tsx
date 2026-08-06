"use client";

/**
 * Calendar appointment detail drawer — Milestone 6.10.
 * Stub: full implementation in Task #8.
 */

import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import NextLink from "next/link";
import type { CalendarAppointment } from "../types/calendar";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/types/appointment";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

type Props = {
  appointment: CalendarAppointment | null;
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  timeZone: string;
  canEdit: boolean;
};

function formatTime(iso: string, tz: string): string {
  const zoned = toZonedTime(new Date(iso), tz);
  return format(zoned, "HH:mm");
}

function formatDate(iso: string, tz: string): string {
  const zoned = toZonedTime(new Date(iso), tz);
  return format(zoned, "EEE, MMM d, yyyy");
}

export default function CalendarAppointmentDrawer({
  appointment,
  open,
  onClose,
  tenantSlug,
  timeZone,
  canEdit,
}: Props) {
  if (!appointment) return null;

  const price = parseFloat(appointment.price);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 380 } } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
              {appointment.appointmentNumber}
            </Typography>
            <Chip
              label={APPOINTMENT_STATUS_LABELS[appointment.status]}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            ✕
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Date & Time</Typography>
            <Typography variant="body2">
              {formatDate(appointment.startsAt, timeZone)}, {formatTime(appointment.startsAt, timeZone)}–{formatTime(appointment.endsAt, timeZone)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Customer</Typography>
            <Typography variant="body2">{appointment.customerName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Service</Typography>
            <Typography variant="body2">{appointment.serviceName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Resource</Typography>
            <Typography variant="body2">{appointment.resourceName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Location</Typography>
            <Typography variant="body2">{appointment.locationName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Duration</Typography>
            <Typography variant="body2">{appointment.durationMinutes} min</Typography>
          </Box>
          {price > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Price</Typography>
              <Typography variant="body2">{appointment.price} {appointment.currency}</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            component={NextLink}
            href={`/${tenantSlug}/appointments/${appointment.id}`}
            variant="outlined"
            size="small"
            fullWidth
          >
            View Full Details
          </Button>
          {canEdit && (
            <Button
              component={NextLink}
              href={`/${tenantSlug}/appointments/${appointment.id}/edit`}
              variant="outlined"
              size="small"
              fullWidth
            >
              Edit Appointment
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
