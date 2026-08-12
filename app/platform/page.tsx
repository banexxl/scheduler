import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Link from "next/link";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import { getPlatformBillingDashboardMetrics } from "@/features/platform/services/platform-billing-admin-queries";

export default async function PlatformHomePage() {
  const metrics = await getPlatformBillingDashboardMetrics();
  const financialMetrics = await import(
    "@/features/platform/services/platform-billing-order-queries"
  ).then((mod) => mod.getPlatformFinancialCounters());

  const hasAttentionItems =
    metrics.failedWebhookEvents > 0 ||
    metrics.unmappedPolarProducts > 0 ||
    metrics.subscriptionsRequiringMapping > 0 ||
    metrics.staleSubscriptionSyncs > 0;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dashboard"
        description="Platform operations overview and health signals."
      />

      {/* Attention section */}
      {hasAttentionItems && (
        <SectionCard title="Requires Attention">
          <Grid container spacing={2}>
            {metrics.failedWebhookEvents > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  label="Failed Webhooks"
                  value={metrics.failedWebhookEvents}
                  variant="error"
                />
              </Grid>
            )}
            {metrics.unmappedPolarProducts > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  label="Unmapped Products"
                  value={metrics.unmappedPolarProducts}
                  variant="warning"
                />
              </Grid>
            )}
            {metrics.subscriptionsRequiringMapping > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  label="Subscriptions Need Mapping"
                  value={metrics.subscriptionsRequiringMapping}
                  variant="warning"
                />
              </Grid>
            )}
            {metrics.staleSubscriptionSyncs > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  label="Stale Syncs"
                  value={metrics.staleSubscriptionSyncs}
                  variant="warning"
                />
              </Grid>
            )}
          </Grid>
        </SectionCard>
      )}

      {/* Platform metrics */}
      <SectionCard title="Platform Metrics">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Active Tenants" value={metrics.activeTenants} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Trialing" value={metrics.trialSubscriptions} variant="info" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Active Subscriptions" value={metrics.activeSubscriptions} variant="success" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Past Due" value={metrics.pastDueSubscriptions} variant={metrics.pastDueSubscriptions > 0 ? "warning" : "default"} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Billing overview */}
      <SectionCard
        title="Billing"
        action={
          <Button component={Link} href="/platform/billing" size="small" variant="text">
            View all
          </Button>
        }
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Billing Plans" value={metrics.activeBillingPlans} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Mapped Products" value={metrics.mappedPolarProducts} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Paid Orders" value={financialMetrics.paidOrders} variant="success" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Refunded Orders" value={financialMetrics.refundedOrders} variant={financialMetrics.refundedOrders > 0 ? "info" : "default"} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Pending Webhooks" value={metrics.pendingWebhookEvents} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard label="Active Prices" value={metrics.activeSynchronizedPrices} />
          </Grid>
        </Grid>
        {metrics.lastProductReconciliation && (
          <Typography
            sx={{ mt: 2, fontSize: "0.75rem", color: "#9ca3af" }}
          >
            Last reconciliation: {metrics.lastProductReconciliation}
          </Typography>
        )}
      </SectionCard>

      {/* Quick links */}
      <SectionCard title="Quick Links">
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label="Tenants"
            component={Link}
            href="/platform/tenants"
            clickable
            variant="outlined"
            size="small"
          />
          <Chip
            label="Subscriptions"
            component={Link}
            href="/platform/billing/subscriptions"
            clickable
            variant="outlined"
            size="small"
          />
          <Chip
            label="Webhooks"
            component={Link}
            href="/platform/billing/webhooks"
            clickable
            variant="outlined"
            size="small"
          />
          <Chip
            label="Orders"
            component={Link}
            href="/platform/billing/orders"
            clickable
            variant="outlined"
            size="small"
          />
          <Chip
            label="Audit Logs"
            component={Link}
            href="/platform/audit-logs"
            clickable
            variant="outlined"
            size="small"
          />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
