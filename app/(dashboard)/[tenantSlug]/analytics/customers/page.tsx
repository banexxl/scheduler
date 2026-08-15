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
import { getCustomerRetentionAnalytics } from "@/features/analytics/services/advanced-analytics-service";
import { getCustomerTrendSeries } from "@/features/analytics/services/trend-series-service";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";

export default async function CustomerAnalyticsPage({
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
  const { data: tenantData } = await supabase.from("tenants").select("default_timezone").eq("id", tenant.id).single();
  const timeZone = (tenantData as { default_timezone: string } | null)?.default_timezone ?? "UTC";

  const range = resolveAdvancedDateRange(period, new Date(), timeZone);
  const retention = await getCustomerRetentionAnalytics(tenant.id, timeZone, { period });
  const customerTrend = await getCustomerTrendSeries(tenant.id, timeZone, range.start, range.end);

  const chartData = customerTrend.slice(-30).map((p) => ({
    label: p.bucket.slice(-5),
    value: p.newCustomers + p.returningCustomers,
    color: "#16a34a",
  }));

  return (
    <Stack spacing={2}>
      <PageHeader title="Customer Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Customers" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Total Customers" value={retention.totalCustomers} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="New" value={retention.newCustomers} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Returning" value={retention.returningCustomers} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Inactive" value={retention.inactiveCustomers} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4 }}><MetricCard label="Repeat Rate" value={retention.repeatCustomerRate !== null ? `${(retention.repeatCustomerRate * 100).toFixed(1)}%` : "—"} /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><MetricCard label="Avg Visits" value={retention.averageVisitsPerCustomer !== null ? retention.averageVisitsPerCustomer.toFixed(1) : "—"} /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><MetricCard label="With Upcoming" value={retention.customersWithUpcoming} /></Grid>
      </Grid>

      <SectionCard title="Customer Trend">
        <SimpleBarChart title="Active customers per day" data={chartData} height={160} />
      </SectionCard>
    </Stack>
  );
}
