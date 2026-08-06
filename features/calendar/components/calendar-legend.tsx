"use client";

/**
 * Calendar legend — Milestone 6.10.
 *
 * Displays color coding for:
 * - Location open hours (background shading)
 * - Resource working hours (overlay)
 * - Appointment statuses
 * - Time off / unavailable
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const LEGEND_ITEMS = [
  { label: "Location open", color: "#f1f8e9", border: "#aed581" },
  { label: "Resource working", color: "#e3f2fd", border: "#90caf9" },
  { label: "Unavailable / Time off", color: "#fbe9e7", border: "#ef9a9a" },
  { label: "Appointment", color: "#e3f2fd", border: "#1976d2" },
];

export default function CalendarLegend() {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        py: 1,
        px: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
      aria-label="Calendar legend"
    >
      {LEGEND_ITEMS.map((item) => (
        <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 14,
              height: 14,
              bgcolor: item.color,
              borderLeft: `3px solid ${item.border}`,
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
