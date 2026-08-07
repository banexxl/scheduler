"use client";

/**
 * Status Breakdown Card — Milestone 8.4.
 *
 * Shows appointment status distribution as a compact list
 * with percentage bars. Emphasizes terminal outcomes for
 * historical ranges.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import type { StatusBreakdownItem } from "../types/analytics";

type Props = {
  items: StatusBreakdownItem[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#ed6c02",
  confirmed: "#1976d2",
  checked_in: "#0288d1",
  in_progress: "#9c27b0",
  completed: "#2e7d32",
  cancelled: "#d32f2f",
  no_show: "#757575",
};

export default function StatusBreakdownCard({ items }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>Status Breakdown</Typography>

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No data for this period.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {items.map((item) => (
            <Box key={item.status}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                <Typography variant="body2">{item.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.count} ({(item.percentage * 100).toFixed(0)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.percentage * 100}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: STATUS_COLORS[item.status] ?? "#bdbdbd",
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
