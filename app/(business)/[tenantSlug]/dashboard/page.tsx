import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessDashboard } from "@/features/business/services/get-business-dashboard";
import { getSubscriptionStatusLabel } from "@/features/business/utils/status-labels";
import BusinessDashboardHeader from "@/features/business/components/business-dashboard-header";
import DashboardStatCard from "@/features/business/components/dashboard-stat-card";
import PrimaryLocationCard from "@/features/business/components/primary-location-card";
import SubscriptionSummaryCard from "@/features/business/components/subscription-summary-card";
import GettingStartedCard from "@/features/business/components/getting-started-card";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  let dashboard;
  try {
    dashboard = await getBusinessDashboard(tenant.id);
  } catch {
    return (
      <Box>
        <Alert severity="error">
          Unable to load dashboard data. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <BusinessDashboardHeader
        businessName={dashboard.business.name}
        businessSlug={dashboard.business.slug}
        businessStatus={dashboard.business.status}
        memberRole={membership.role}
      />

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard
            label="Locations"
            value={dashboard.counts.locations}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard
            label="Team Members"
            value={dashboard.counts.activeTeamMembers}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard
            label="Customers"
            value={dashboard.counts.customers}
            helperText={
              dashboard.counts.customers === 0
                ? "Customers will appear here after they book or register with your business."
                : undefined
            }
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard
            label="Subscription"
            value={
              dashboard.subscription
                ? getSubscriptionStatusLabel(dashboard.subscription.status)
                : "—"
            }
          />
        </Grid>
      </Grid>

      {/* Detail cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PrimaryLocationCard
            location={dashboard.primaryLocation}
            tenantSlug={dashboard.business.slug}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubscriptionSummaryCard
            subscription={dashboard.subscription}
            tenantSlug={dashboard.business.slug}
          />
        </Grid>
      </Grid>

      {/* Getting started */}
      <GettingStartedCard tenantSlug={dashboard.business.slug} />

      {/* Business info footer */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="caption" color="text.secondary">
          Timezone: {dashboard.business.defaultTimezone} | Currency:{" "}
          {dashboard.business.defaultCurrency}
        </Typography>
      </Box>
    </Box>
  );
}
