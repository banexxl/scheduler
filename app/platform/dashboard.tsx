"use client";

/**
 * Premium Platform Admin Dashboard — Linear-inspired dark UI.
 */

import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import PeopleIcon from "@mui/icons-material/People";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CampaignIcon from "@mui/icons-material/Campaign";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AnimatedMetricCard from "@/components/dashboard/AnimatedMetricCard";
import GlassCard from "@/components/dashboard/GlassCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import QuickActionCard from "@/components/dashboard/QuickActionCard";
import { dashboardColors } from "@/styles/theme/dashboard-tokens";
import type { TimelineItem } from "@/components/dashboard/ActivityTimeline";

type PlatformMetrics = {
  activeTenants: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  failedWebhookEvents: number;
  unmappedPolarProducts: number;
  subscriptionsRequiringMapping: number;
  staleSubscriptionSyncs: number;
  activeBillingPlans: number;
  mappedPolarProducts: number;
  pendingWebhookEvents: number;
  activeSynchronizedPrices: number;
  lastProductReconciliation: string | null;
};

type FinancialMetrics = {
  paidOrders: number;
  refundedOrders: number;
};

type Props = {
  metrics: PlatformMetrics;
  financialMetrics: FinancialMetrics;
};

export default function PlatformDashboard({ metrics, financialMetrics }: Props) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const hasAttention = metrics.failedWebhookEvents > 0 || metrics.unmappedPolarProducts > 0 || metrics.subscriptionsRequiringMapping > 0;

  // Mock activity timeline (in production, load from server)
  const activityItems: TimelineItem[] = [
    { id: "1", title: "New tenant registered", description: "Business signed up via self-service", time: "2 minutes ago", color: dashboardColors.status.success },
    { id: "2", title: "Subscription upgraded", description: "Pro plan activated", time: "18 minutes ago", color: dashboardColors.accent.primary },
    { id: "3", title: "Booking milestone", description: "1,000th booking created on platform", time: "1 hour ago", color: dashboardColors.status.info },
    { id: "4", title: "Webhook processed", description: "Polar subscription sync completed", time: "3 hours ago" },
  ];

  return (
    <DashboardShell>
      {/* Hero */}
      <DashboardHeader
        title="Command Center"
        subtitle="Platform operations and health at a glance."
        date={today}
      />

      {/* Attention Banner */}
      {hasAttention && (
        <GlassCard sx={{ mb: 3, borderColor: `${dashboardColors.status.warning}30`, bgcolor: `${dashboardColors.status.warningGlow}` }} delay={0.1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WarningAmberIcon sx={{ color: dashboardColors.status.warning, fontSize: 20 }} />
            <Box sx={{ fontSize: "0.8125rem", color: dashboardColors.text.primary }}>
              {metrics.failedWebhookEvents > 0 && <span>{metrics.failedWebhookEvents} failed webhooks</span>}
              {metrics.unmappedPolarProducts > 0 && <span> &middot; {metrics.unmappedPolarProducts} unmapped products</span>}
              {metrics.subscriptionsRequiringMapping > 0 && <span> &middot; {metrics.subscriptionsRequiringMapping} subscriptions need mapping</span>}
            </Box>
          </Stack>
        </GlassCard>
      )}

      {/* KPI Grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedMetricCard
            label="Total Tenants"
            value={metrics.activeTenants}
            icon={<PeopleIcon />}
            accentColor={dashboardColors.accent.primary}
            delay={0.1}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedMetricCard
            label="Active Subscriptions"
            value={metrics.activeSubscriptions}
            icon={<CreditCardIcon />}
            accentColor={dashboardColors.status.success}
            trend={metrics.trialSubscriptions > 0 ? `${metrics.trialSubscriptions} trialing` : undefined}
            trendUp
            delay={0.2}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedMetricCard
            label="Paid Orders"
            value={financialMetrics.paidOrders}
            icon={<AttachMoneyIcon />}
            accentColor={dashboardColors.accent.secondary}
            delay={0.3}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AnimatedMetricCard
            label="Billing Plans"
            value={metrics.activeBillingPlans}
            icon={<CalendarTodayIcon />}
            delay={0.4}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left: Billing Metrics */}
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionHeader title="Billing Overview" delay={0.3} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <GlassCard delay={0.35}>
                <Box sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Mapped Products</Box>
                <Box sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>{metrics.mappedPolarProducts}</Box>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <GlassCard delay={0.4}>
                <Box sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Active Prices</Box>
                <Box sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>{metrics.activeSynchronizedPrices}</Box>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <GlassCard delay={0.45}>
                <Box sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Refunded</Box>
                <Box sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5, color: financialMetrics.refundedOrders > 0 ? dashboardColors.status.warning : dashboardColors.text.primary }}>
                  {financialMetrics.refundedOrders}
                </Box>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <GlassCard delay={0.5}>
                <Box sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Past Due</Box>
                <Box sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5, color: metrics.pastDueSubscriptions > 0 ? dashboardColors.status.error : dashboardColors.text.primary }}>
                  {metrics.pastDueSubscriptions}
                </Box>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <GlassCard delay={0.55}>
                <Box sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Pending Webhooks</Box>
                <Box sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>{metrics.pendingWebhookEvents}</Box>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <GlassCard delay={0.6}>
                <Box sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Stale Syncs</Box>
                <Box sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5, color: metrics.staleSubscriptionSyncs > 0 ? dashboardColors.status.warning : dashboardColors.text.primary }}>
                  {metrics.staleSubscriptionSyncs}
                </Box>
              </GlassCard>
            </Grid>
          </Grid>
        </Grid>

        {/* Right: Activity Feed */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionHeader title="Recent Activity" delay={0.35} />
          <GlassCard delay={0.4}>
            <ActivityTimeline items={activityItems} />
          </GlassCard>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <SectionHeader title="Quick Actions" delay={0.5} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <QuickActionCard
              title="Tenants"
              description="Manage all tenants"
              icon={<AddBusinessIcon />}
              href="/platform/tenants"
              delay={0.55}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <QuickActionCard
              title="Subscriptions"
              description="View all subscriptions"
              icon={<ReceiptLongIcon />}
              href="/platform/billing/subscriptions"
              delay={0.6}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <QuickActionCard
              title="Operations"
              description="Webhooks & sync"
              icon={<CampaignIcon />}
              href="/platform/operations"
              delay={0.65}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <QuickActionCard
              title="Settings"
              description="System configuration"
              icon={<SettingsIcon />}
              href="/platform/billing"
              delay={0.7}
            />
          </Grid>
        </Grid>
      </Box>
    </DashboardShell>
  );
}
