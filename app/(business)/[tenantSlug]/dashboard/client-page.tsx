"use client";

/**
 * Dashboard Client Page — Milestone 8.4.
 *
 * Interactive analytics dashboard with period filters, summary cards,
 * trend charts, rankings, and breakdown displays.
 *
 * Receives pre-loaded DashboardAnalyticsDTO from the server page.
 * Manages filter state via URL navigation for period changes.
 */

import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import type { DashboardAnalyticsDTO, AnalyticsPeriod } from "@/features/analytics/types/analytics";
import DashboardSummaryCards from "@/features/analytics/components/dashboard-summary-cards";
import AppointmentTrendChart from "@/features/analytics/components/appointment-trend-chart";
import TopServicesCard from "@/features/analytics/components/top-services-card";
import ResourceAnalyticsCard from "@/features/analytics/components/resource-analytics-card";
import LocationBreakdownCard from "@/features/analytics/components/location-breakdown-card";
import BookingSourceCard from "@/features/analytics/components/booking-source-card";
import StatusBreakdownCard from "@/features/analytics/components/status-breakdown-card";
import CustomerTrendCard from "@/features/analytics/components/customer-trend-card";

type Props = {
  tenantSlug: string;
  analytics: DashboardAnalyticsDTO;
  currency: string;
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: "Today",
  "7days": "7 Days",
  this_month: "This Month",
  prev_month: "Prev Month",
};

export default function DashboardClientPage({ tenantSlug, analytics, currency }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = analytics.period;

  function handlePeriodChange(_: unknown, value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`/${tenantSlug}/dashboard?${params.toString()}`);
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Period Filter */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Analytics</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={currentPeriod}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            {(Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map((p) => (
              <ToggleButton key={p} value={p}>
                {PERIOD_LABELS[p]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            component="a"
            href={`/${tenantSlug}/appointments/today`}
            size="small"
            variant="text"
          >
            Today&apos;s schedule &rarr;
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {analytics.dateRange.label}
      </Typography>

      {/* Summary Cards */}
      <DashboardSummaryCards summary={analytics.summary} currency={currency} />

      <Divider sx={{ my: 3 }} />

      {/* Appointment Trend */}
      <AppointmentTrendChart data={analytics.appointmentTrend} />

      <Divider sx={{ my: 3 }} />

      {/* Rankings Row */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        <TopServicesCard services={analytics.topServices} currency={currency} />
        <ResourceAnalyticsCard resources={analytics.resourceAnalytics} />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Breakdown Row */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 3 }}>
        <CustomerTrendCard
          newCustomers={analytics.summary.periodNewCustomers}
          returningCustomers={analytics.summary.periodReturningCustomers}
          trend={analytics.customerTrend}
        />
        <BookingSourceCard sources={analytics.bookingSources} />
        <StatusBreakdownCard items={analytics.statusBreakdown} />
      </Box>

      {/* Location (only if multiple) */}
      {analytics.locationAnalytics.length > 1 && (
        <>
          <Divider sx={{ my: 3 }} />
          <LocationBreakdownCard locations={analytics.locationAnalytics} currency={currency} />
        </>
      )}
    </Box>
  );
}
