"use client";

/**
 * Simple Bar Chart — Milestone 15.9.1.
 *
 * Lightweight chart using MUI Box/Typography.
 * No external chart library dependency.
 * Accessible: values shown as text, not color-only.
 */

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";

type DataPoint = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  title: string;
  data: DataPoint[];
  maxBars?: number;
  height?: number;
};

export default function SimpleBarChart({ title, data, maxBars = 20, height = 200 }: Props) {
  const visibleData = data.slice(0, maxBars);
  const maxValue = Math.max(...visibleData.map((d) => d.value), 1);

  if (visibleData.length === 0) {
    return (
      <Box>
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 1 }}>{title}</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>No data</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 1 }}>{title}</Typography>
      <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height, px: 1 }}>
        {visibleData.map((point, idx) => {
          const barHeight = maxValue > 0 ? (point.value / maxValue) * (height - 24) : 0;
          return (
            <Tooltip key={idx} title={`${point.label}: ${point.value}`} arrow>
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                <Typography sx={{ fontSize: "0.5625rem", color: "#8b8b9e" }}>{point.value > 0 ? point.value : ""}</Typography>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 32,
                    height: Math.max(2, barHeight),
                    bgcolor: point.color ?? "#7C3AED",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.2s",
                  }}
                  role="img"
                  aria-label={`${point.label}: ${point.value}`}
                />
                <Typography sx={{ fontSize: "0.5rem", color: "#5c5c72", maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                  {point.label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
