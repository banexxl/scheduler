"use client";

/**
 * Calendar appointment block — Milestone 6.10.
 * Positioned absolutely within resource/day columns.
 * Stub: full implementation in Task #7.
 */

import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { CalendarAppointment } from "../types/calendar";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";

const STATUS_BG: Record<AppointmentStatus, string> = {
  pending: "#fff3e0",
  confirmed: "#e3f2fd",
  checked_in: "#e0f7fa",
  in_progress: "#f3e5f5",
  completed: "#e8f5e9",
  cancelled: "#fafafa",
  no_show: "#f5f5f5",
};

const STATUS_BORDER: Record<AppointmentStatus, string> = {
  pending: "#ff9800",
  confirmed: "#1976d2",
  checked_in: "#00acc1",
  in_progress: "#9c27b0",
  completed: "#4caf50",
  cancelled: "#bdbdbd",
  no_show: "#757575",
};

type Props = {
  appointment: CalendarAppointment;
  top: number;
  height: number;
  onClick: () => void;
  onDrop?: (newTop: number) => void;
};

export default function CalendarAppointmentBlock({
  appointment,
  top,
  height,
  onClick,
  onDrop,
}: Props) {
  const compact = height < 40;
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);
  const moved = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    if (!onDrop) return;
    e.preventDefault();
    dragStartY.current = e.clientY;
    moved.current = false;
    setDragging(true);

    function handleMouseMove(ev: MouseEvent) {
      const offset = ev.clientY - dragStartY.current;
      if (Math.abs(offset) > 4) moved.current = true;
      setDragOffset(offset);
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setDragging(false);

      if (moved.current) {
        // Snap to 15-min grid
        const pxPerMin = 1.2;
        const rawMinutes = dragOffset / pxPerMin;
        const snapped = Math.round(rawMinutes / 15) * 15;
        const newTop = top + snapped * pxPerMin;
        if (newTop >= 0) {
          onDrop?.(newTop);
        }
      }

      setDragOffset(0);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  const effectiveTop = dragging ? top + dragOffset : top;

  return (
    <Box
      onClick={() => { if (!moved.current) onClick(); }}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      aria-label={`${appointment.customerName} - ${appointment.serviceName} at ${appointment.startsAt}`}
      sx={{
        position: "absolute",
        top: effectiveTop,
        left: 2,
        right: 2,
        height,
        bgcolor: STATUS_BG[appointment.status],
        borderLeft: `3px solid ${STATUS_BORDER[appointment.status]}`,
        borderRadius: 0.5,
        overflow: "hidden",
        cursor: onDrop ? (dragging ? "grabbing" : "grab") : "pointer",
        px: 0.5,
        py: compact ? 0 : 0.25,
        opacity: dragging ? 0.7 : 1,
        transition: dragging ? "none" : "opacity 0.15s",
        "&:hover": { opacity: 0.85, boxShadow: 1 },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
        zIndex: dragging ? 100 : 1,
        userSelect: "none",
      }}
    >
      <Typography variant="caption" fontWeight={600} noWrap sx={{ fontSize: compact ? "0.6rem" : "0.7rem", lineHeight: 1.2 }}>
        {appointment.customerName}
      </Typography>
      {!compact && (
        <Typography variant="caption" noWrap sx={{ fontSize: "0.6rem", color: "text.secondary", display: "block", lineHeight: 1.2 }}>
          {appointment.serviceName}
        </Typography>
      )}
    </Box>
  );
}
