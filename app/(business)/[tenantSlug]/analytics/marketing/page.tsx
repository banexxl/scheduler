import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import AnalyticsNav from "@/features/analytics/components/analytics-nav";
import AnalyticsPeriodSelector from "@/features/analytics/components/analytics-period-selector";
import { getMarketingAnalytics } from "@/features/analytics/services/advanced-analytics-service";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";

export default async function MarketingAnalyticsPage({
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

  const marketing = await getMarketingAnalytics(tenant.id, timeZone, { period });

  return (
    <Stack spacing={2}>
      <PageHeader title="Marketing Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Marketing" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      <SectionCard title="Campaigns">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Campaigns Sent" value={marketing.campaigns.totalSent} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Recipients" value={marketing.campaigns.totalRecipients} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Delivered" value={marketing.campaigns.totalDelivered} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Failed" value={marketing.campaigns.totalFailed} /></Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Automations">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Active" value={marketing.automations.activeAutomations} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Enrollments" value={marketing.automations.totalEnrollments} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Completed" value={marketing.automations.completedJourneys} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Failed" value={marketing.automations.failedJourneys} /></Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Referrals">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Attributed" value={marketing.referrals.totalAttributed} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Qualified" value={marketing.referrals.totalQualified} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Qualification Rate" value={marketing.referrals.qualificationRate !== null ? `${(marketing.referrals.qualificationRate * 100).toFixed(1)}%` : "—"} /></Grid>
        </Grid>
      </SectionCard>
    </Stack>
  );
}
