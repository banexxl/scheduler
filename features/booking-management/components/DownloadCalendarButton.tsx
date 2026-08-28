"use client";

/**
 * Download Calendar Button — Milestone 18.0.
 *
 * Generates and downloads an ICS file for a booking.
 * Reuses the existing ICS generation utility.
 */

import { useCallback } from "react";
import Button from "@mui/material/Button";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { generateIcsContent, downloadIcsFile } from "@/features/public-booking/utils/generate-ics";
import type { BookingDetails } from "../types";

type Props = {
  booking: BookingDetails;
};

export default function DownloadCalendarButton({ booking }: Props) {
  const handleDownload = useCallback(() => {
    const description = [
      `Service: ${booking.service.name}`,
      `Location: ${booking.location.name}`,
      booking.staff ? `With: ${booking.staff.name}` : null,
      `Duration: ${booking.durationMinutes} min`,
    ].filter(Boolean).join("\n");

    const icsContent = generateIcsContent({
      title: `${booking.service.name} at ${booking.tenantName}`,
      startsAtUtc: booking.startsAt,
      endsAtUtc: booking.endsAt,
      location: booking.location.name,
      description,
      organizerName: booking.tenantName,
    });

    const filename = `booking-${booking.reference.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    downloadIcsFile(icsContent, filename);
  }, [booking]);

  return (
    <Button
      variant="outlined"
      startIcon={<CalendarTodayIcon />}
      onClick={handleDownload}
      sx={{ textTransform: "none" }}
    >
      Add to Calendar
    </Button>
  );
}
