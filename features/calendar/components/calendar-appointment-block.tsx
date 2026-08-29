"use client";

/**
 * Calendar appointment block — Premium Dark Theme.
 * Positioned absolutely within resource/day columns.
 */

import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { CalendarAppointment } from "../types/calendar";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";

const STATUS_BG: Record<AppointmentStatus, string> = {
  pending: "rgba(245, 158, 11, 0.12)",
  confirmed: "rgba(59, 130, 246, 0.12)",
  checked_in: "rgba(6, 182, 212, 0.12)",
  in_progress: "rgba(124, 58, 237, 0.15)",
  completed: "rgba(16, 185, 129, 0.12)",
  cancelled: "rgba(139, 139, 158, 0.08)",
  no_show: "rgba(139, 139, 158, 0.08)",
};

const STATUS_BORDER: Record<AppointmentStatus, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  checked_in: "#06B6D4",
  in_progress: "#7C3AED",
  completed: "#10B981",
  cancelled: "#5c5c72",
  no_show: "#5c5c72",
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
        borderRadius: 1,
        overflow: "hidden",
        cursor: onDrop ? (dragging ? "grabbing" : "grab") : "pointer",
        px: 0.75,
        py: compact ? 0 : 0.25,
        opacity: dragging ? 0.7 : 1,
        transition: dragging ? "none" : "opacity 0.15s, background-color 0.15s",
        "&:hover": {
          bgcolor: STATUS_BG[appointment.status].replace(/0\.\d+\)$/, "0.2)"),
          boxShadow: `0 0 12px ${STATUS_BORDER[appointment.status]}20`,
        },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
        zIndex: dragging ? 100 : 1,
        userSelect: "none",
        backdropFilter: "blur(4px)",
      }}
    >
      <Typography variant="caption" fontWeight={600} noWrap sx={{ fontSize: compact ? "0.6rem" : "0.7rem", lineHeight: 1.2, color: "#f0f0f5" }}>
        {appointment.customerName}
      </Typography>
      {!compact && (
        <Typography variant="caption" noWrap sx={{ fontSize: "0.6rem", color: "#8b8b9e", display: "block", lineHeight: 1.2 }}>
          {appointment.serviceName}
        </Typography>
      )}
    </Box>
  );
}
