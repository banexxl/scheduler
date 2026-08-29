"use client";

/**
 * Premium Tenant Dashboard — Linear-inspired dark UI.
 */

import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { motion } from "framer-motion";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AnimatedMetricCard from "@/components/dashboard/AnimatedMetricCard";
import GlassCard from "@/components/dashboard/GlassCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import AvailabilityRing from "@/components/dashboard/AvailabilityRing";
import { dashboardColors, dashboardLayout } from "@/styles/theme/dashboard-tokens";
import type { DashboardAnalyticsDTO } from "@/features/analytics/types/analytics";

type TenantDashboardData = {
  business: {
    name: string;
    slug: string;
    status: string;
    defaultTimezone: string;
    defaultCurrency: string;
  };
  counts: {
    locations: number;
    activeTeamMembers: number;
    customers: number;
    todayAppointments: number;
    upcomingAppointments: number;
  };
  subscription: {
    status: string;
  } | null;
};

type Props = {
  tenantSlug: string;
  dashboard: TenantDashboardData;
  analytics: DashboardAnalyticsDTO | null;
};

export default function PremiumTenantDashboard({ tenantSlug, dashboard, analytics }: Props) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const occupancy = Math.min(100, Math.round((dashboard.counts.todayAppointments / Math.max(1, 8)) * 100));

  return (
    <DashboardShell>
      {/* Hero */}
      <DashboardHeader
        title={`Welcome back, ${dashboard.business.name}`}
        subtitle={dashboard.subscription?.status === "active" ? "Pro Plan" : dashboard.subscription?.status === "trialing" ? "Trial" : "Free Plan"}
        date={today}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              href={`/${tenantSlug}/calendar`}
              variant="contained"
              size="small"
              sx={{
                bgcolor: dashboardColors.accent.primary,
                "&:hover": { bgcolor: dashboardColors.accent.primaryDark },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: `${dashboardLayout.borderRadius.sm}px`,
              }}
            >
              Calendar
            </Button>
          </Stack>
        }
      />

      {/* Hero Stats Row */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <GlassCard delay={0.1} sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
            <AvailabilityRing percentage={occupancy} />
          </GlassCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 9 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <AnimatedMetricCard
                label="Today"
                value={dashboard.counts.todayAppointments}
                suffix=" bookings"
                icon={<CalendarTodayIcon />}
                accentColor={dashboardColors.accent.primary}
                delay={0.15}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AnimatedMetricCard
                label="Upcoming"
                value={dashboard.counts.upcomingAppointments}
                icon={<EventAvailableIcon />}
                accentColor={dashboardColors.status.info}
                delay={0.2}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AnimatedMetricCard
                label="Customers"
                value={dashboard.counts.customers}
                icon={<PeopleIcon />}
                accentColor={dashboardColors.status.success}
                delay={0.25}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <AnimatedMetricCard
                label="Team"
                value={dashboard.counts.activeTeamMembers}
                icon={<AccessTimeIcon />}
                delay={0.3}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Analytics & Revenue */}
      {analytics && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader title="Performance" subtitle={`Period: ${analytics.period}`} delay={0.35} />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6, md: 3 }}>
              <GlassCard delay={0.4}>
                <Typography sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Revenue</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>
                  {analytics.summary.periodCompletedValue
                    ? `${dashboard.business.defaultCurrency} ${analytics.summary.periodCompletedValue}`
                    : "—"}
                </Typography>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <GlassCard delay={0.45}>
                <Typography sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Completed</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>{analytics.summary.periodCompleted}</Typography>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <GlassCard delay={0.5}>
                <Typography sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>Completion Rate</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>
                  {analytics.summary.completionRate ? `${analytics.summary.completionRate}%` : "—"}
                </Typography>
              </GlassCard>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <GlassCard delay={0.55}>
                <Typography sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted }}>New Customers</Typography>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>{analytics.summary.periodNewCustomers}</Typography>
              </GlassCard>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Quick Actions */}
      <SectionHeader title="Quick Navigation" delay={0.55} />
      <Grid container spacing={1.5}>
        {[
          { label: "My Day", href: `/${tenantSlug}/my-day` },
          { label: "Appointments", href: `/${tenantSlug}/appointments` },
          { label: "Services", href: `/${tenantSlug}/services` },
          { label: "Staff", href: `/${tenantSlug}/staff` },
          { label: "Customers", href: `/${tenantSlug}/customers` },
          { label: "Analytics", href: `/${tenantSlug}/analytics` },
          { label: "Settings", href: `/${tenantSlug}/settings` },
          { label: "Homepage", href: `/${tenantSlug}/site/homepage` },
        ].map((link, idx) => (
          <Grid key={link.label} size={{ xs: 6, sm: 4, md: 3 }}>
            <Box
              component={motion.a}
              href={link.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.05, duration: 0.3 }}
              whileHover={{ y: -2 }}
              sx={{
                display: "block",
                p: 2,
                borderRadius: `${dashboardLayout.borderRadius.sm}px`,
                bgcolor: dashboardColors.bg.card,
                border: `1px solid ${dashboardColors.border.subtle}`,
                textDecoration: "none",
                color: dashboardColors.text.primary,
                fontSize: "0.8125rem",
                fontWeight: 500,
                textAlign: "center",
                transition: "border-color 0.2s",
                "&:hover": { borderColor: dashboardColors.border.hover },
              }}
            >
              {link.label}
            </Box>
          </Grid>
        ))}
      </Grid>
    </DashboardShell>
  );
}
