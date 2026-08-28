"use client";

/**
 * Empty Availability — Milestone 17.1.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type Props = {
  title?: string;
  description?: string;
};

export default function EmptyAvailability({
  title = "No Availability",
  description = "There are no available time slots for this date. Try another date.",
}: Props) {
  return (
    <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}
