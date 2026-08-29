"use client";

/**
 * Calendar operating-hours overlay — Milestone 6.10.
 *
 * Renders background shading for location open hours and optional
 * resource working hours within the calendar time grid.
 *
 * Layers (bottom to top):
 * 1. Closed time (default grey background)
 * 2. Location open hours (green tint)
 * 3. Resource working hours (blue tint, when resource selected)
 * 4. Time off blocks (red tint)
 * 5. Appointment blocks (on top)
 *
 * This component renders the shaded regions as absolutely-positioned
 * boxes within a resource column or day column.
 */

import Box from "@mui/material/Box";
import type { CalendarConfig } from "@/lib/scheduling/calendar-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HoursPeriod = {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
};

export type TimeOffBlock = {
  startMinutes: number; // Minutes from calendar start
  endMinutes: number;
  label?: string;
};

type Props = {
  /** Location open periods for the day */
  locationPeriods?: HoursPeriod[];
  /** Resource working periods for the day */
  resourcePeriods?: HoursPeriod[];
  /** Time off blocks (already converted to minutes from calendar start) */
  timeOffBlocks?: TimeOffBlock[];
  /** Calendar config for positioning */
  config: CalendarConfig;
  /** Total grid height */
  totalHeight: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodToPixelRange(
  period: HoursPeriod,
  config: CalendarConfig
): { top: number; height: number } | null {
  const [startH, startM] = period.startTime.split(":").map(Number) as [number, number];
  const [endH, endM] = period.endTime.split(":").map(Number) as [number, number];

  const startMinutes = startH * 60 + startM - config.startHour * 60;
  const endMinutes = endH * 60 + endM - config.startHour * 60;
  const totalGridMinutes = (config.endHour - config.startHour) * 60;

  const effectiveStart = Math.max(0, startMinutes);
  const effectiveEnd = Math.min(totalGridMinutes, endMinutes);

  if (effectiveEnd <= effectiveStart) return null;

  return {
    top: effectiveStart * config.pixelsPerMinute,
    height: (effectiveEnd - effectiveStart) * config.pixelsPerMinute,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendarHoursOverlay({
  locationPeriods,
  resourcePeriods,
  timeOffBlocks,
  config,
  totalHeight,
}: Props) {
  return (
    <>
      {/* Closed background (full column height) */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: totalHeight,
          bgcolor: "rgba(139, 139, 158, 0.05)",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Location open hours */}
      {locationPeriods?.map((period, idx) => {
        const pos = periodToPixelRange(period, config);
        if (!pos) return null;
        return (
          <Box
            key={`loc-${idx}`}
            sx={{
              position: "absolute",
              top: pos.top,
              left: 0,
              right: 0,
              height: pos.height,
              bgcolor: "rgba(16, 185, 129, 0.06)",
              opacity: 0.5,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        );
      })}

      {/* Resource working hours */}
      {resourcePeriods?.map((period, idx) => {
        const pos = periodToPixelRange(period, config);
        if (!pos) return null;
        return (
          <Box
            key={`res-${idx}`}
            sx={{
              position: "absolute",
              top: pos.top,
              left: 0,
              right: 0,
              height: pos.height,
              bgcolor: "rgba(59, 130, 246, 0.06)",
              opacity: 0.35,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        );
      })}

      {/* Time off blocks */}
      {timeOffBlocks?.map((block, idx) => {
        const totalGridMinutes = (config.endHour - config.startHour) * 60;
        const effectiveStart = Math.max(0, block.startMinutes);
        const effectiveEnd = Math.min(totalGridMinutes, block.endMinutes);
        if (effectiveEnd <= effectiveStart) return null;

        const top = effectiveStart * config.pixelsPerMinute;
        const height = (effectiveEnd - effectiveStart) * config.pixelsPerMinute;

        return (
          <Box
            key={`off-${idx}`}
            title={block.label ?? "Unavailable"}
            sx={{
              position: "absolute",
              top,
              left: 0,
              right: 0,
              height,
              bgcolor: "rgba(239, 68, 68, 0.08)",
              opacity: 0.5,
              pointerEvents: "none",
              zIndex: 0,
              borderLeft: "2px solid rgba(239, 68, 68, 0.3)",
            }}
          />
        );
      })}
    </>
  );
}
