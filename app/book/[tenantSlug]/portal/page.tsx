import { redirect } from "next/navigation";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { getPortalSessionFromCookie } from "@/features/customer-portal/services/portal-session-cookies";
import PortalAccessForm from "@/features/customer-portal/components/portal-access-form";
import PortalDashboardPage from "@/features/customer-portal/components/portal-dashboard-page";
import { getCustomerPortalAppointments } from "@/features/customer-portal/services/portal-appointment-queries";
import { getCustomerWaitlistEntries } from "@/features/waitlist/services/waitlist-portal-queries";

/**
 * Customer Portal — Supabase Auth based.
 *
 * If Supabase session exists + tenant customer match → show appointment dashboard.
 * If no session → show email magic-link form.
 */
export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await resolvePublicTenant(tenantSlug);
  if (!tenant) redirect(`/book/${tenantSlug}`);

  // Check for existing Supabase Auth session
  const session = await getPortalSessionFromCookie(tenantSlug);

  if (session && session.tenantId === tenant.id) {
    // Authenticated portal — load appointments and waitlist
    const [data, waitlistEntries] = await Promise.all([
      getCustomerPortalAppointments(
        session.tenantId,
        session.normalizedEmail,
        tenant.defaultTimeZone
      ),
      getCustomerWaitlistEntries(session.tenantId, session.normalizedEmail),
    ]);

    return (
      <PortalDashboardPage
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        appointments={data}
        timeZone={tenant.defaultTimeZone}
        waitlistEntries={waitlistEntries}
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
