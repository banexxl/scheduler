import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getBusinessDashboard } from "@/features/business/services/get-business-dashboard";
import { getSubscriptionStatusLabel } from "@/features/business/utils/status-labels";
import { resolveOnboardingProgress } from "@/features/onboarding/services/get-onboarding-progress";
import { getDashboardAnalytics } from "@/features/analytics/services/get-dashboard-analytics";
import { ANALYTICS_PERIODS } from "@/features/analytics/types/analytics";
import type { AnalyticsPeriod } from "@/features/analytics/types/analytics";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import DashboardSetupChecklist from "@/features/onboarding/components/dashboard-setup-checklist";
import DashboardClientPage from "./client-page";
import StatusChip from "@/components/ui/status-chip";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);

  let dashboard;
  try {
    dashboard = await getBusinessDashboard(tenant.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <Alert severity="error">Unable to load dashboard: {message}</Alert>
    );
  }

  // Resolve analytics period
  const periodParam = query.period;
  const period: AnalyticsPeriod = (
    periodParam && ANALYTICS_PERIODS.includes(periodParam as AnalyticsPeriod)
  ) ? periodParam as AnalyticsPeriod : "7days";

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

  const showOnboarding = onboardingProgress.status !== "completed" &&
    onboardingProgress.completedSteps.length < onboardingProgress.remainingSteps.length + onboardingProgress.completedSteps.length;

  return (
    <Stack spacing={3}>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description={`${dashboard.business.name} — ${dashboard.business.defaultTimezone}`}
        status={<StatusChip label={dashboard.business.status} size="small" />}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              href={`/${tenantSlug}/appointments/today`}
              variant="outlined"
              size="small"
            >
              Today
            </Button>
            <Button
              href={`/${tenantSlug}/calendar`}
              variant="contained"
              size="small"
            >
              Calendar
            </Button>
          </Stack>
        }
      />

      {/* Onboarding checklist (only when incomplete) */}
      {showOnboarding && (
        <DashboardSetupChecklist
          tenantSlug={dashboard.business.slug}
          progress={onboardingProgress}
        />
      )}

      {/* Quick stats */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Locations" value={dashboard.counts.locations} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Team Members" value={dashboard.counts.activeTeamMembers} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Customers" value={dashboard.counts.customers} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard
            label="Subscription"
            value={dashboard.subscription
              ? getSubscriptionStatusLabel(dashboard.subscription.status)
              : "Free"}
            variant={dashboard.subscription?.status === "active" ? "success" : "default"}
          />
        </Grid>
      </Grid>

      {/* Analytics */}
      {analytics ? (
        <SectionCard title="Analytics">
          <DashboardClientPage
            tenantSlug={tenantSlug}
            analytics={analytics}
            currency={dashboard.business.defaultCurrency}
          />
        </SectionCard>
      ) : (
        <SectionCard title="Analytics">
          <Typography sx={{ fontSize: "0.8125rem", color: "#6b7280" }}>
            Analytics data is not available yet. Create appointments to see trends.
          </Typography>
        </SectionCard>
      )}

      {/* Quick links */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label="My Day" component="a" href={`/${tenantSlug}/my-day`} clickable size="small" variant="outlined" />
        <Chip label="Services" component="a" href={`/${tenantSlug}/services`} clickable size="small" variant="outlined" />
        <Chip label="Team" component="a" href={`/${tenantSlug}/team`} clickable size="small" variant="outlined" />
        <Chip label="Settings" component="a" href={`/${tenantSlug}/settings`} clickable size="small" variant="outlined" />
        <Chip label="Health" component="a" href={`/${tenantSlug}/health`} clickable size="small" variant="outlined" />
      </Stack>
    </Stack>
  );
}
