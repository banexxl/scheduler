"use client";

/**
 * Status Chip — Milestone 10.4.
 *
 * Consistent status display that does NOT rely on color alone.
 * Always shows text label alongside color indicator.
 */

import Chip from "@mui/material/Chip";

export type StatusChipProps = {
  label: string;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info";
  size?: "small" | "medium";
};

const STATUS_COLOR_MAP: Record<string, StatusChipProps["color"]> = {
  pending: "warning",
  confirmed: "primary",
  checked_in: "info",
  in_progress: "secondary",
  completed: "success",
  cancelled: "error",
  no_show: "default",
  active: "success",
  inactive: "default",
  blocked: "error",
  linked: "success",
  revoked: "error",
  expired: "default",
  exhausted: "warning",
};

/**
 * Renders a status chip with consistent color mapping.
 * Label is always visible (never color-only).
 */
export default function StatusChip({
  label,
  color,
  size = "small",
}: StatusChipProps) {
  const resolvedColor = color ?? STATUS_COLOR_MAP[label.toLowerCase().replace(/[\s_-]/g, "_")] ?? "default";

  return (
    <Chip
      label={label}
      color={resolvedColor}
      size={size}
      variant="filled"
    />
  );
}
