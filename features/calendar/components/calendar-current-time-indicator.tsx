"use client";

/**
 * Current-time indicator — Milestone 6.10.
 * Horizontal line positioned at tenant-local current time.
 * Stub: full implementation in Task #9.
 */

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import { getTenantCurrentMinutes } from "@/lib/scheduling/calendar-utils";
import type { CalendarConfig } from "@/lib/scheduling/calendar-utils";

type Props = {
  timeZone: string;
  config: CalendarConfig;
};

export default function CalendarCurrentTimeIndicator({ timeZone, config }: Props) {
  const [currentMinutes, setCurrentMinutes] = useState(() =>
    getTenantCurrentMinutes(new Date(), timeZone)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getTenantCurrentMinutes(new Date(), timeZone));
    }, 60_000); // Update every minute
    return () => clearInterval(interval);
  }, [timeZone]);

  const minutesFromStart = currentMinutes - config.startHour * 60;
  const top = minutesFromStart * config.pixelsPerMinute;

  // Don't show if outside visible range
  const totalMinutes = (config.endHour - config.startHour) * 60;
  if (minutesFromStart < 0 || minutesFromStart > totalMinutes) return null;

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        top,
        left: 60, // After time axis
        right: 0,
        height: "2px",
        bgcolor: "error.main",
        zIndex: 10,
        pointerEvents: "none",
        "&::before": {
          content: '""',
          position: "absolute",
          left: -4,
          top: -3,
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "error.main",
        },
      }}
    />
  );
}
