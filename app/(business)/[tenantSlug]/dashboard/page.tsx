import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getBusinessDashboard } from "@/features/business/services/get-business-dashboard";
import { getSubscriptionStatusLabel } from "@/features/business/utils/status-labels";
import BusinessDashboardHeader from "@/features/business/components/business-dashboard-header";
import DashboardStatCard from "@/features/business/components/dashboard-stat-card";
import SubscriptionSummaryCard from "@/features/business/components/subscription-summary-card";
import DashboardSetupChecklist from "@/features/onboarding/components/dashboard-setup-checklist";
import { resolveOnboardingProgress } from "@/features/onboarding/services/get-onboarding-progress";
import { getDashboardAnalytics } from "@/features/analytics/services/get-dashboard-analytics";
import { ANALYTICS_PERIODS } from "@/features/analytics/types/analytics";
import type { AnalyticsPeriod } from "@/features/analytics/types/analytics";
import DashboardClientPage from "./client-page";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  let dashboard;
  try {
    dashboard = await getBusinessDashboard(tenant.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box>
        <Alert severity="error">Unable to load dashboard: {message}</Alert>
      </Box>
    );
  }

  // Resolve analytics period from URL
  const periodParam = query.period;
  const period: AnalyticsPeriod = (
    periodParam && ANALYTICS_PERIODS.includes(periodParam as AnalyticsPeriod)
  ) ? periodParam as AnalyticsPeriod : "7days";

  // Load analytics
  let analytics;
  try {
    analytics = await getDashboardAnalytics(
      tenant.id,
      dashboard.business.defaultTimezone,
      dashboard.business.defaultCurrency,
      {
        period,
        locationId: query.locationId ?? null,
        resourceId: query.resourceId ?? null,
      }
    );
  } catch {
    analytics = null;
  }

  // Onboarding progress
  const supabase = createServiceRoleClient();
  const [onboardingRowResult, locationsResult, resourcesResult,
    servicesResult, locationHoursResult, resourceHoursResult,
    bookingRulesResult, publicBookingResult] = await Promise.all([
      supabase.from("tenant_onboarding").select("current_step, status")
        .eq("tenant_id", dashboard.business.id).maybeSingle(),
      supabase.from("locations").select("id")
        .eq("tenant_id", dashboard.business.id).eq("is_active", true),
      supabase.from("resources").select("id")
        .eq("tenant_id", dashboard.business.id).eq("is_active", true),
      supabase.from("services").select("id")
        .eq("tenant_id", dashboard.business.id).eq("is_active", true),
      supabase.from("location_working_hours").select("id, location_id").limit(1),
      supabase.from("resource_working_hours").select("id, tenant_id")
        .eq("tenant_id", dashboard.business.id).limit(1),
      supabase.from("tenant_booking_rules").select("minimum_notice_minutes")
        .eq("tenant_id", dashboard.business.id).maybeSingle(),
      supabase.from("tenant_public_booking_settings").select("is_enabled")
        .eq("tenant_id", dashboard.business.id).maybeSingle(),
    ]);

  const onboardingProgress = resolveOnboardingProgress({
    currentStep: onboardingRowResult.data?.current_step ?? "business_details",
    status: onboardingRowResult.data?.status ?? "not_started",
    tenant: {
      name: dashboard.business.name,
      defaultTimezone: dashboard.business.defaultTimezone,
      defaultCurrency: dashboard.business.defaultCurrency,
    },
    locations: locationsResult.data ?? [],
    resources: resourcesResult.data ?? [],
    services: servicesResult.data ?? [],
    locationHours: locationHoursResult.data ?? [],
    resourceHours: resourceHoursResult.data ?? [],
    bookingRules: bookingRulesResult.data
      ? { minimumNoticeMinutes: bookingRulesResult.data.minimum_notice_minutes }
      : null,
    publicBookingSettings: publicBookingResult.data
      ? { isEnabled: publicBookingResult.data.is_enabled }
      : null,
    plan: { canUsePublicBooking: true },
  });

  return (
    <Box>
      <BusinessDashboardHeader
        businessName={dashboard.business.name}
        businessSlug={dashboard.business.slug}
        businessStatus={dashboard.business.status}
        memberRole={membership.role}
      />

      {/* Business stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard label="Locations" value={dashboard.counts.locations} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard label="Team Members" value={dashboard.counts.activeTeamMembers} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard label="Customers" value={dashboard.counts.customers} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <DashboardStatCard
            label="Subscription"
            value={dashboard.subscription
              ? getSubscriptionStatusLabel(dashboard.subscription.status)
              : "—"}
          />
        </Grid>
      </Grid>

      {/* Analytics */}
      {analytics ? (
        <DashboardClientPage
          tenantSlug={tenantSlug}
          analytics={analytics}
          currency={dashboard.business.defaultCurrency}
        />
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Analytics data is not available yet.
        </Alert>
      )}

      {/* Subscription */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubscriptionSummaryCard
            subscription={dashboard.subscription}
            tenantSlug={dashboard.business.slug}
          />
        </Grid>
      </Grid>

      {/* Onboarding checklist */}
      <DashboardSetupChecklist
        tenantSlug={dashboard.business.slug}
        progress={onboardingProgress}
      />

      {/* Footer */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="caption" color="text.secondary">
          Timezone: {dashboard.business.defaultTimezone} | Currency:{" "}
          {dashboard.business.defaultCurrency}
        </Typography>
      </Box>
    </Box>
  );
}
