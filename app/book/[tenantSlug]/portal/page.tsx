import { redirect } from "next/navigation";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { getPortalSessionFromCookie } from "@/features/customer-portal/services/portal-session-cookies";
import PortalAccessForm from "@/features/customer-portal/components/portal-access-form";
import PortalDashboardPage from "@/features/customer-portal/components/portal-dashboard-page";
import { getCustomerPortalAppointments } from "@/features/customer-portal/services/portal-appointment-queries";

/**
 * Customer Portal — Milestone 8.6.
 *
 * If session exists → show appointment dashboard.
 * If no session → show email access form.
 */
export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await resolvePublicTenant(tenantSlug);
  if (!tenant) redirect(`/book/${tenantSlug}`);

  // Check for existing session
  const session = await getPortalSessionFromCookie(tenantSlug);

  if (session && session.tenantId === tenant.id) {
    // Authenticated portal — load appointments
    const data = await getCustomerPortalAppointments(
      session.tenantId,
      session.normalizedEmail,
      tenant.defaultTimeZone
    );

    return (
      <PortalDashboardPage
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        appointments={data}
        timeZone={tenant.defaultTimeZone}
      />
    );
  }

  // No session — show access form
  return (
    <PortalAccessForm
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
    />
  );
}
