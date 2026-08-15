import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import AnalyticsNav from "@/features/analytics/components/analytics-nav";
import AnalyticsPeriodSelector from "@/features/analytics/components/analytics-period-selector";
import { getFinancialAnalytics, getPackageAnalytics, getGiftCardAnalytics } from "@/features/analytics/services/advanced-analytics-service";
import { formatCurrencyAmount } from "@/features/analytics/utils/currency-utils";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";

export default async function FinanceAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenantSlug } = await params;
  const { period: periodParam } = await searchParams;
  // Finance requires owner/admin
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const period = (periodParam ?? "30days") as AdvancedAnalyticsPeriod;

  const supabase = createServiceRoleClient();
  const { data: tenantData } = await supabase.from("tenants").select("default_timezone").eq("id", tenant.id).single();
  const timeZone = (tenantData as { default_timezone: string } | null)?.default_timezone ?? "UTC";

  const financial = await getFinancialAnalytics(tenant.id, timeZone, { period });
  const packages = await getPackageAnalytics(tenant.id, timeZone, { period });
  const giftCards = await getGiftCardAnalytics(tenant.id, timeZone, { period });

  return (
    <Stack spacing={2}>
      <PageHeader title="Finance Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Finance" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      {/* Per-Currency Financial */}
      <SectionCard title="Revenue by Currency">
        {financial.currencies.length === 0 ? (
          <Typography sx={{ fontSize: "0.8125rem", color: "#9ca3af" }}>No payment data for this period.</Typography>
        ) : (
          <Grid container spacing={2}>
            {financial.currencies.map((c) => (
              <Grid key={c.currency} size={{ xs: 12, sm: 6 }}>
                <Box sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>{c.currency}</Typography>
                  <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#16a34a", mt: 0.5 }}>
                    Net: {formatCurrencyAmount(c.netCollected, c.currency)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mt: 0.5 }}>
                    Collected: {formatCurrencyAmount(c.collected, c.currency)} | Refunded: {formatCurrencyAmount(c.refunded, c.currency)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>

      {/* Packages */}
      <SectionCard title="Packages">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><Box sx={{ textAlign: "center" }}><Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{packages.sold}</Typography><Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Sold</Typography></Box></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><Box sx={{ textAlign: "center" }}><Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{packages.active}</Typography><Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Active</Typography></Box></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><Box sx={{ textAlign: "center" }}><Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{packages.creditsConsumed}</Typography><Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Credits Used</Typography></Box></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><Box sx={{ textAlign: "center" }}><Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{packages.creditsRemaining}</Typography><Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Credits Left</Typography></Box></Grid>
        </Grid>
      </SectionCard>

      {/* Gift Cards */}
      <SectionCard title="Gift Cards">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><Box sx={{ textAlign: "center" }}><Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{giftCards.sold}</Typography><Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Sold</Typography></Box></Grid>
          {giftCards.outstandingByCurrency.map((c) => (
            <Grid key={c.currency} size={{ xs: 6, sm: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "1rem", fontWeight: 700 }}>{formatCurrencyAmount(c.amount, c.currency)}</Typography>
                <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Outstanding ({c.currency})</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </Stack>
  );
}
