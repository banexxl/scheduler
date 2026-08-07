"use client";

/**
 * Dashboard Summary Cards — Milestone 8.4.
 *
 * Top-level metric cards: today operations, period totals,
 * rates, appointment value, customer counts, and comparison indicators.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type { DashboardSummary } from "../types/analytics";

type Props = {
  summary: DashboardSummary;
  currency: string;
};

function formatValue(value: number, prefix = ""): string {
  if (value >= 1000) return `${prefix}${(value / 1000).toFixed(1)}k`;
  return `${prefix}${value.toLocaleString()}`;
}

function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCurrency(value: number, curr: string): string {
  if (value === 0) return "—";
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${curr}`;
}

function ComparisonBadge({ change }: { change: number | null }) {
  if (change === null) return null;
  const isPositive = change > 0;
  const isNegative = change < 0;
  const color = isPositive ? "success.main" : isNegative ? "error.main" : "text.secondary";
  const sign = isPositive ? "+" : "";
  return (
    <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
      {sign}{change.toFixed(1)}%
    </Typography>
  );
}

function MetricCard({
  label, value, comparison, subtitle,
}: {
  label: string;
  value: string;
  comparison?: number | null;
  subtitle?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="baseline">
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        {comparison !== undefined && <ComparisonBadge change={comparison} />}
      </Stack>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      )}
    </Paper>
  );
}

export default function DashboardSummaryCards({ summary, currency }: Props) {
  return (
    <Box>
      {/* Today row */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Today
      </Typography>
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(7, 1fr)" },
        gap: 1.5, mb: 2,
      }}>
        <MetricCard label="Total" value={String(summary.todayTotal)} />
        <MetricCard label="Upcoming" value={String(summary.todayUpcoming)} />
        <MetricCard label="Checked In" value={String(summary.todayCheckedIn)} />
        <MetricCard label="In Progress" value={String(summary.todayInProgress)} />
        <MetricCard label="Completed" value={String(summary.todayCompleted)} />
        <MetricCard label="Cancelled" value={String(summary.todayCancelled)} />
        <MetricCard label="No-Show" value={String(summary.todayNoShow)} />
      </Box>

      {/* Period row */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Period
      </Typography>
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
        gap: 1.5,
      }}>
        <MetricCard
          label="Appointments"
          value={formatValue(summary.periodTotal)}
          comparison={summary.comparison.totalChange}
        />
        <MetricCard
          label="Completed"
          value={formatValue(summary.periodCompleted)}
          comparison={summary.comparison.completedChange}
        />
        <MetricCard
          label="Completed Value"
          value={formatCurrency(summary.periodCompletedValue, currency)}
          comparison={summary.comparison.valueChange}
          subtitle="Appointment price total"
        />
        <MetricCard
          label="Avg Value"
          value={summary.averageAppointmentValue !== null
            ? formatCurrency(Math.round(summary.averageAppointmentValue), currency)
            : "—"}
        />
        <MetricCard
          label="Completion Rate"
          value={formatRate(summary.completionRate)}
        />
        <MetricCard
          label="Cancellation Rate"
          value={formatRate(summary.cancellationRate)}
          comparison={summary.comparison.cancelledChange}
        />
        <MetricCard
          label="No-Show Rate"
          value={formatRate(summary.noShowRate)}
          comparison={summary.comparison.noShowRateChange}
          subtitle="pts vs prev period"
        />
        <MetricCard
          label="Customers"
          value={`${summary.periodNewCustomers} new / ${summary.periodReturningCustomers} ret`}
        />
      </Box>
    </Box>
  );
}
