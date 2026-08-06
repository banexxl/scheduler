"use client";

/**
 * Calendar mobile agenda view — Milestone 6.10.
 *
 * Provides a mobile-friendly fallback for the calendar:
 * - Simple vertical list grouped by time
 * - No complex grid layout
 * - All actions accessible without drag-and-drop
 * - Used on narrow screens (xs/sm breakpoints)
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import type { CalendarAppointment } from "../types/calendar";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/types/appointment";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

const STATUS_COLORS: Record<AppointmentStatus, "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  confirmed: "primary",
  checked_in: "info",
  in_progress: "secondary",
  completed: "success",
  cancelled: "error",
  no_show: "default",
};

type Props = {
  appointments: CalendarAppointment[];
  timeZone: string;
  localDate: string;
  onAppointmentClick: (appt: CalendarAppointment) => void;
};

function formatTime(iso: string, tz: string): string {
  const zoned = toZonedTime(new Date(iso), tz);
  return format(zoned, "HH:mm");
}

export default function CalendarMobileAgenda({
  appointments,
  timeZone,
  localDate,
  onAppointmentClick,
}: Props) {
  if (appointments.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No appointments for {localDate}.
        </Typography>
      </Paper>
    );
  }

  // Sort by start time
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {sorted.map((appt) => (
        <Paper
          key={appt.id}
          elevation={1}
          onClick={() => onAppointmentClick(appt)}
          sx={{
            p: 1.5,
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover" },
            "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onAppointmentClick(appt); }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {formatTime(appt.startsAt, timeZone)}–{formatTime(appt.endsAt, timeZone)}
              </Typography>
              <Typography variant="body2">{appt.customerName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {appt.serviceName} · {appt.resourceName}
              </Typography>
            </Box>
            <Chip
              label={APPOINTMENT_STATUS_LABELS[appt.status]}
              color={STATUS_COLORS[appt.status]}
              size="small"
              variant="outlined"
            />
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
