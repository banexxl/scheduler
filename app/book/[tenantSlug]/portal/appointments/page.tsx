import { requirePortalSession } from "@/features/customer-portal/services/require-portal-session";
import { getCustomerPortalAppointments } from "@/features/customer-portal/services/portal-appointment-queries";
import PortalPageShell from "@/features/customer-portal/components/PortalPageShell";
import PortalAppointmentsPage from "@/features/customer-portal/components/portal-appointments-page";

/**
 * Customer Portal — Full Appointments Page.
 *
 * Loads all appointments (upcoming, past, cancelled) at once; tab switching
 * happens client-side with no query params or page reloads.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { session, tenant } = await requirePortalSession(tenantSlug);

  const data = await getCustomerPortalAppointments(
    session.tenantId,
    session.normalizedEmail,
    tenant.defaultTimeZone,
    session.customerId
  );

  return (
    <PortalPageShell>
      <PortalAppointmentsPage
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        timeZone={tenant.defaultTimeZone}
        data={data}
      />
    </PortalPageShell>
  );
}
