"use client";

/**
 * Booking Source Card — Milestone 8.4.
 *
 * Shows appointment source breakdown (internal, public booking, etc.)
 * as a simple bar/list with percentages.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import type { BookingSourceItem } from "../types/analytics";

type Props = {
  sources: BookingSourceItem[];
};

export default function BookingSourceCard({ sources }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>Booking Sources</Typography>

      {sources.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No booking data for this period.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {sources.map((s) => (
            <Box key={s.source}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                <Typography variant="body2">{s.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.count} ({(s.percentage * 100).toFixed(0)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={s.percentage * 100}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
