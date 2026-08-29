import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessDashboard } from "@/features/business/services/get-business-dashboard";
import { getDashboardAnalytics } from "@/features/analytics/services/get-dashboard-analytics";
import { ANALYTICS_PERIODS } from "@/features/analytics/types/analytics";
import type { AnalyticsPeriod } from "@/features/analytics/types/analytics";
import TenantDashboard from "./dashboard"

/**
 * Tenant Dashboard — Premium Redesign.
 *
 * Server component that loads data, delegates to the premium client dashboard.
 */
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
    return <Alert severity="error">Unable to load dashboard: {message}</Alert>;
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

  // Derive today/upcoming counts from analytics
  const todayAppointments = analytics?.summary?.todayTotal ?? 0;
  const upcomingAppointments = analytics?.summary?.todayUpcoming ?? 0;

  return (
    <TenantDashboard
      tenantSlug={tenantSlug}
      dashboard={{
        business: {
          name: dashboard.business.name,
          slug: dashboard.business.slug,
          status: dashboard.business.status,
          defaultTimezone: dashboard.business.defaultTimezone,
          defaultCurrency: dashboard.business.defaultCurrency,
        },
        counts: {
          locations: dashboard.counts.locations,
          activeTeamMembers: dashboard.counts.activeTeamMembers,
          customers: dashboard.counts.customers,
          todayAppointments,
          upcomingAppointments,
        },
        subscription: dashboard.subscription ? { status: dashboard.subscription.status } : null,
      }}
      analytics={analytics}
    />
  );
}
