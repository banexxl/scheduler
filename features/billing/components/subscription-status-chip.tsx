"use client";

/**
 * Subscription Status Chip — displays current subscription state.
 */

import Chip from "@mui/material/Chip";

type Props = {
  status: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: "success" | "warning" | "error" | "info" | "default" }> = {
  active: { label: "Active", color: "success" },
  trialing: { label: "Trial", color: "info" },
  past_due: { label: "Past Due", color: "warning" },
  canceled: { label: "Canceled", color: "warning" },
  expired: { label: "Expired", color: "error" },
  none: { label: "No Plan", color: "default" },
};

export default function SubscriptionStatusChip({ status }: Props) {
  const key = status ?? "none";
  const label = STATUS_CONFIG[key]?.label ?? "Unknown";
  const color = STATUS_CONFIG[key]?.color ?? "default";

  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
    />
  );
}
