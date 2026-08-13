import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import AnalyticsNav from "@/features/analytics/components/analytics-nav";
import AnalyticsPeriodSelector from "@/features/analytics/components/analytics-period-selector";
import SimpleBarChart from "@/features/analytics/components/simple-bar-chart";
import { resolveAdvancedDateRange } from "@/features/analytics/services/advanced-date-ranges";
import { getAppointmentTrendSeries } from "@/features/analytics/services/trend-series-service";
import { safePercentage } from "@/features/analytics/utils/currency-utils";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";

export default async function AppointmentAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenantSlug } = await params;
  const { period: periodParam } = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);
  const period = (periodParam ?? "30days") as AdvancedAnalyticsPeriod;

  const supabase = createServiceRoleClient();
  const { data: tenantData } = await supabase
    .from("tenants").select("default_timezone").eq("id", tenant.id).single();
  const timeZone = (tenantData as { default_timezone: string } | null)?.default_timezone ?? "UTC";

  const range = resolveAdvancedDateRange(period, new Date(), timeZone);

  // Get trend series
  const trend = await getAppointmentTrendSeries(tenant.id, timeZone, range.start, range.end);

  // Aggregate totals from trend
  const totals = trend.reduce(
    (acc, p) => ({ total: acc.total + p.total, completed: acc.completed + p.completed, cancelled: acc.cancelled + p.cancelled, noShow: acc.noShow + p.noShow }),
    { total: 0, completed: 0, cancelled: 0, noShow: 0 }
  );

  const completionRate = safePercentage(totals.completed, totals.completed + totals.cancelled + totals.noShow);
  const cancellationRate = safePercentage(totals.cancelled, totals.completed + totals.cancelled + totals.noShow);
  const noShowRate = safePercentage(totals.noShow, totals.completed + totals.noShow);

  const chartData = trend.slice(-30).map((p) => ({
    label: p.bucket.slice(-5), // MM-DD or similar
    value: p.total,
  }));

  return (
    <Stack spacing={2}>
      <PageHeader title="Appointment Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Appointments" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Total" value={totals.total} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Completed" value={totals.completed} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Cancelled" value={totals.cancelled} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="No-shows" value={totals.noShow} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4 }}><MetricCard label="Completion Rate" value={completionRate !== null ? `${completionRate}%` : "—"} /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><MetricCard label="Cancellation Rate" value={cancellationRate !== null ? `${cancellationRate}%` : "—"} /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><MetricCard label="No-show Rate" value={noShowRate !== null ? `${noShowRate}%` : "—"} /></Grid>
      </Grid>

      <SectionCard title="Appointment Trend">
        <SimpleBarChart title="Appointments per day" data={chartData} height={160} />
      </SectionCard>
    </Stack>
  );
}
