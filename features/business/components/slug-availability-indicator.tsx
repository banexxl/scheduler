"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import type { SlugAvailabilityStatus } from "../hooks/use-business-slug-availability";

type SlugAvailabilityIndicatorProps = {
  status: SlugAvailabilityStatus;
  message: string;
  onRetry?: () => void;
};

/**
 * Visual indicator for slug availability status.
 * Uses both color and text/icon to convey status (accessible).
 */
export default function SlugAvailabilityIndicator({
  status,
  message,
  onRetry,
}: SlugAvailabilityIndicatorProps) {
  if (status === "idle" || status === "invalid") {
    return null;
  }

  const statusConfig = getStatusConfig(status);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        mt: 0.5,
        mb: 0.5,
        pl: 1.75,
      }}
      role="status"
      aria-live="polite"
      aria-label={`Slug availability: ${message}`}
    >
      <Typography
        component="span"
        sx={{ fontSize: "0.9rem", lineHeight: 1 }}
        aria-hidden="true"
      >
        {statusConfig.icon}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: statusConfig.color, fontWeight: 500 }}
      >
        {message}
      </Typography>
      {status === "error" && onRetry && (
        <Button
          size="small"
          onClick={onRetry}
          sx={{ ml: 1, minWidth: "auto", fontSize: "0.7rem", py: 0 }}
          aria-label="Retry availability check"
        >
          Retry
        </Button>
      )}
    </Box>
  );
}

function getStatusConfig(status: SlugAvailabilityStatus): {
  icon: string;
  color: string;
} {
  switch (status) {
    case "checking":
      return { icon: "\u23F3", color: "text.secondary" }; // hourglass
    case "available":
      return { icon: "\u2713", color: "success.main" }; // checkmark
    case "unavailable":
      return { icon: "\u2717", color: "error.main" }; // cross
    case "error":
      return { icon: "\u26A0", color: "warning.main" }; // warning
    default:
      return { icon: "", color: "text.secondary" };
  }
}
