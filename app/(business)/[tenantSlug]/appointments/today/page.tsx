import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import { getTodayAppointments } from "@/features/appointments/services/get-today-appointments";
import TodayAppointmentsClientPage from "./client-page";

export default async function TodayAppointmentsPage({
     params,
     searchParams,
}: {
     params: Promise<{ tenantSlug: string }>;
     searchParams: Promise<Record<string, string | undefined>>;
}) {
     const { tenantSlug } = await params;
     const query = await searchParams;
     const { tenant, membership } = await requireTenantMember(tenantSlug);

     if (!(["owner", "admin", "manager", "staff"].includes(membership.role))) {
          redirect(`/${tenantSlug}/dashboard`);
     }

     const settings = await getBusinessSettings(tenant.id);
     const result = await getTodayAppointments(tenant.id, settings.defaultTimezone, {
          locationId: query.locationId,
          resourceId: query.resourceId,
          status: query.status,
     });

     return (
          <TodayAppointmentsClientPage
               tenantSlug={tenantSlug}
               timeZone={settings.defaultTimezone}
               initialData={result}
               initialFilters={{
                    locationId: query.locationId,
                    resourceId: query.resourceId,
                    status: query.status,
               }}
          />
     );
}
