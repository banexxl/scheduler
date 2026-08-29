"use client";

/**
 * Appointment Trend Chart — Milestone 8.4.
 *
 * Simple SVG line chart showing daily appointment counts over the period.
 * Series: Total, Completed, Cancelled.
 *
 * No external charting library — uses inline SVG for zero-dependency rendering.
 * Includes text summary table below chart for accessibility.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type { AppointmentTrendPoint } from "../types/analytics";

type Props = {
  data: AppointmentTrendPoint[];
};

const CHART_HEIGHT = 180;
const CHART_PADDING = 24;

const COLORS = {
  total: "#3B82F6",
  completed: "#10B981",
  cancelled: "#EF4444",
};

function buildPath(points: number[], maxValue: number, width: number): string {
  if (points.length === 0) return "";
  const stepX = points.length > 1 ? (width - CHART_PADDING * 2) / (points.length - 1) : 0;
  const scaleY = maxValue > 0 ? (CHART_HEIGHT - CHART_PADDING * 2) / maxValue : 0;

  return points
    .map((val, i) => {
      const x = CHART_PADDING + i * stepX;
      const y = CHART_HEIGHT - CHART_PADDING - val * scaleY;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function AppointmentTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Appointment Trend</Typography>
        <Typography variant="body2" color="text.secondary">
          No appointment data for this period.
        </Typography>
      </Paper>
    );
  }

  const maxValue = Math.max(
    1,
    ...data.map((d) => Math.max(d.total, d.completed, d.cancelled))
  );

  const totalPath = buildPath(data.map((d) => d.total), maxValue, 600);
  const completedPath = buildPath(data.map((d) => d.completed), maxValue, 600);
  const cancelledPath = buildPath(data.map((d) => d.cancelled), maxValue, 600);

  const totalSum = data.reduce((s, d) => s + d.total, 0);
  const completedSum = data.reduce((s, d) => s + d.completed, 0);
  const cancelledSum = data.reduce((s, d) => s + d.cancelled, 0);
  const noShowSum = data.reduce((s, d) => s + d.noShow, 0);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" gutterBottom>Appointment Trend</Typography>

      {/* SVG Chart */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 600 ${CHART_HEIGHT}`}
          width="100%"
          height={CHART_HEIGHT}
          role="img"
          aria-label={`Appointment trend: ${totalSum} total, ${completedSum} completed, ${cancelledSum} cancelled over ${data.length} days`}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={CHART_PADDING}
              y1={CHART_PADDING + frac * (CHART_HEIGHT - CHART_PADDING * 2)}
              x2={600 - CHART_PADDING}
              y2={CHART_PADDING + frac * (CHART_HEIGHT - CHART_PADDING * 2)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          ))}

          {/* Lines */}
          <path d={totalPath} fill="none" stroke={COLORS.total} strokeWidth={2} />
          <path d={completedPath} fill="none" stroke={COLORS.completed} strokeWidth={1.5} strokeDasharray="4,2" />
          <path d={cancelledPath} fill="none" stroke={COLORS.cancelled} strokeWidth={1.5} strokeDasharray="2,2" />

          {/* Y-axis label */}
          <text x={4} y={CHART_PADDING - 4} fontSize={10} fill="#666">{maxValue}</text>
          <text x={4} y={CHART_HEIGHT - CHART_PADDING + 12} fontSize={10} fill="#666">0</text>

          {/* X-axis labels (first and last date) */}
          {data.length > 0 && (
            <>
              <text x={CHART_PADDING} y={CHART_HEIGHT - 4} fontSize={9} fill="#666">
                {data[0]!.date.slice(5)}
              </text>
              <text x={600 - CHART_PADDING - 30} y={CHART_HEIGHT - 4} fontSize={9} fill="#666">
                {data[data.length - 1]!.date.slice(5)}
              </text>
            </>
          )}
        </svg>
      </Box>

      {/* Legend + Summary */}
      <Stack direction="row" spacing={3} sx={{ mt: 1.5 }} flexWrap="wrap">
        <LegendItem color={COLORS.total} label="Total" value={totalSum} />
        <LegendItem color={COLORS.completed} label="Completed" value={completedSum} dashed />
        <LegendItem color={COLORS.cancelled} label="Cancelled" value={cancelledSum} dashed />
        <LegendItem color="#666" label="No-Show" value={noShowSum} />
      </Stack>
    </Paper>
  );
}

function LegendItem({
  color, label, value, dashed,
}: {
  color: string; label: string; value: number; dashed?: boolean;
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{
        width: 16, height: 2, backgroundColor: color,
        borderStyle: dashed ? "dashed" : "solid",
        borderWidth: dashed ? "1px 0 0 0" : 0,
      }} />
      <Typography variant="caption" color="text.secondary">
        {label}: <strong>{value}</strong>
      </Typography>
    </Stack>
  );
}
