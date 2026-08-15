import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import { getDashboardAnalytics } from "@/features/analytics/services/get-dashboard-analytics";
import { getCustomerRetentionAnalytics, getFinancialAnalytics } from "@/features/analytics/services/advanced-analytics-service";
import { formatCurrencyAmount } from "@/features/analytics/utils/currency-utils";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";
import type { AnalyticsPeriod } from "@/features/analytics/types/analytics";

/**
 * Analytics Overview — Milestone 15.9.
 */
export default async function AnalyticsOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ period?: string; comparison?: string }>;
}) {
  const { tenantSlug } = await params;
  const { period: periodParam } = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();
  const { data: tenantData } = await supabase
    .from("tenants")
    .select("default_timezone, default_currency")
    .eq("id", tenant.id)
    .single();

  const timeZone = (tenantData as { default_timezone: string; default_currency: string } | null)?.default_timezone ?? "UTC";
  const currency = (tenantData as { default_timezone: string; default_currency: string } | null)?.default_currency ?? "RSD";

  // Map advanced period to existing dashboard period for reuse
  const advancedPeriod = (periodParam ?? "30days") as AdvancedAnalyticsPeriod;
  const dashboardPeriod: AnalyticsPeriod = advancedPeriod === "30days" ? "7days" :
    advancedPeriod === "this_quarter" || advancedPeriod === "this_year" ? "this_month" :
    advancedPeriod as AnalyticsPeriod;

  // Get existing dashboard analytics (appointment metrics)
  const dashboard = await getDashboardAnalytics(tenant.id, timeZone, currency, { period: dashboardPeriod });

  // Get customer retention
  const retention = await getCustomerRetentionAnalytics(tenant.id, timeZone, { period: advancedPeriod });

  // Get financial
  const financial = await getFinancialAnalytics(tenant.id, timeZone, { period: advancedPeriod });

  const periods: Array<{ value: string; label: string }> = [
    { value: "7days", label: "7 days" },
    { value: "30days", label: "30 days" },
    { value: "this_month", label: "This month" },
    { value: "this_quarter", label: "Quarter" },
    { value: "this_year", label: "Year" },
  ];

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Analytics"
        description="Business performance insights."
        breadcrumbs={[{ label: "Analytics" }]}
        action={
          <Button href={`/${tenantSlug}/analytics?period=${advancedPeriod}`} variant="text" size="small">
            Export CSV
          </Button>
        }
      />

      {/* Period Selector */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {periods.map((p) => (
          <Chip
            key={p.value}
            label={p.label}
            component="a"
            href={`/${tenantSlug}/analytics?period=${p.value}`}
            clickable
            variant={advancedPeriod === p.value ? "filled" : "outlined"}
            color={advancedPeriod === p.value ? "primary" : "default"}
            size="small"
          />
        ))}
      </Stack>

      {/* Appointment Metrics */}
      <SectionCard title="Appointments">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Total" value={dashboard.summary.periodTotal} secondary={dashboard.summary.comparison.totalChange !== null ? `${dashboard.summary.comparison.totalChange > 0 ? "+" : ""}${dashboard.summary.comparison.totalChange.toFixed(1)}%` : undefined} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Completed" value={dashboard.summary.periodCompleted} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Cancelled" value={dashboard.summary.periodCancelled} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="No-shows" value={dashboard.summary.periodNoShow} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Customer Metrics */}
      <SectionCard title="Customers">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Total" value={retention.totalCustomers} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="New" value={retention.newCustomers} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Returning" value={retention.returningCustomers} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Repeat Rate" value={retention.repeatCustomerRate !== null ? `${(retention.repeatCustomerRate * 100).toFixed(1)}%` : "—"} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Financial Metrics (per currency) */}
      <SectionCard title="Financial">
        {financial.currencies.length === 0 ? (
          <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No payment data for this period.</Typography>
        ) : (
          <Grid container spacing={2}>
            {financial.currencies.map((c) => (
              <Grid key={c.currency} size={{ xs: 12, sm: 4 }}>
                <Box sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", mb: 0.5 }}>{c.currency}</Typography>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#16a34a" }}>
                    {formatCurrencyAmount(c.netCollected, c.currency)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>
                    Collected: {formatCurrencyAmount(c.collected, c.currency)} | Refunded: {formatCurrencyAmount(c.refunded, c.currency)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>

      {/* Navigation */}
      <SectionCard title="Detailed Reports">
        <Grid container spacing={1.5}>
          {[
            { label: "Appointments", href: `/${tenantSlug}/analytics/appointments` },
            { label: "Customers", href: `/${tenantSlug}/analytics/customers` },
            { label: "Services", href: `/${tenantSlug}/analytics/services` },
            { label: "Staff", href: `/${tenantSlug}/analytics/staff` },
            { label: "Locations", href: `/${tenantSlug}/analytics/locations` },
            { label: "Finance", href: `/${tenantSlug}/analytics/finance` },
            { label: "Marketing", href: `/${tenantSlug}/analytics/marketing` },
          ].map((item) => (
            <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
              <Button href={item.href} variant="outlined" fullWidth size="small" sx={{ textTransform: "none" }}>
                {item.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </Stack>
  );
}
