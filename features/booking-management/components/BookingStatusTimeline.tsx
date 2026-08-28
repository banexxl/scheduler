"use client";

/**
 * Booking Status Timeline — Milestone 18.0.
 *
 * Vertical timeline showing booking lifecycle.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type { BookingDetails, TimelineEntry } from "../types";

type Props = {
  booking: BookingDetails;
};

function formatTimestamp(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingStatusTimeline({ booking }: Props) {
  const entries = buildTimeline(booking);

  return (
    <Stack spacing={0}>
      {entries.map((entry, idx) => (
        <Box key={entry.status} sx={{ display: "flex", gap: 1.5, pb: idx < entries.length - 1 ? 2 : 0 }}>
          {/* Dot + line */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: entry.completed ? "success.main" : entry.active ? "primary.main" : "grey.300",
                border: entry.active ? 2 : 0,
                borderColor: "primary.main",
                flexShrink: 0,
              }}
            />
            {idx < entries.length - 1 && (
              <Box sx={{ width: 2, flexGrow: 1, bgcolor: entry.completed ? "success.light" : "grey.200", mt: 0.5 }} />
            )}
          </Box>

          {/* Content */}
          <Box sx={{ pb: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: entry.active || entry.completed ? 600 : 400,
                color: entry.active || entry.completed ? "text.primary" : "text.disabled",
              }}
            >
              {entry.label}
            </Typography>
            {entry.timestamp && (
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(entry.timestamp)}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function buildTimeline(booking: BookingDetails): TimelineEntry[] {
  const { status } = booking;

  const entries: TimelineEntry[] = [];

  // Confirmed
  entries.push({
    status: "confirmed",
    label: "Confirmed",
    timestamp: booking.confirmedAt,
    active: status === "confirmed",
    completed: ["checked_in", "in_progress", "completed"].includes(status),
  });

  // Cancelled branch
  if (status === "cancelled") {
    entries.push({
      status: "cancelled",
      label: booking.cancellationReason ? `Cancelled — ${booking.cancellationReason}` : "Cancelled",
      timestamp: booking.cancelledAt,
      active: true,
      completed: false,
    });
    return entries;
  }

  // No-show branch
  if (status === "no_show") {
    entries.push({
      status: "no_show",
      label: "No Show",
      timestamp: booking.noShowAt,
      active: true,
      completed: false,
    });
    return entries;
  }

  // Completed
  entries.push({
    status: "completed",
    label: "Completed",
    timestamp: booking.completedAt,
    active: status === "completed",
    completed: false,
  });

  return entries;
}
