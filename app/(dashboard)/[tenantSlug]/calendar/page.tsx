import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
import { getCalendarAppointments } from "@/features/calendar/services/get-calendar-appointments";
import { getTenantToday, getTenantMonthRange } from "@/lib/scheduling/calendar-utils";
import AppointmentCalendar from "@/features/calendar/components/appointment-calendar";
import PageHeader from "@/features/platform/components/page-header";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = ["owner", "admin"].includes(membership.role);

  // Load tenant timezone
  const tenantData = await loadTenantTimezone(tenant.id);
  if (!tenantData) {
    return <Alert severity="error">Unable to load tenant configuration.</Alert>;
  }
  const timeZone = tenantData.defaultTimezone;
  const today = getTenantToday(new Date(), timeZone);

  // Load locations and resources
  let locations;
  let resources;
  try {
    [locations, resources] = await Promise.all([
      getBusinessLocations(tenant.id),
      getBusinessResources(tenant.id),
    ]);
  } catch {
    return <Alert severity="error">Unable to load calendar data.</Alert>;
  }

  const activeLocations = locations.filter((l) => l.isActive);
  const activeResources = resources.filter((r) => r.isActive);

  // Load the full current month of appointments in one go
  const monthRange = getTenantMonthRange(today, timeZone);

  let appointments: import("@/features/calendar/types/calendar").CalendarAppointment[];
  try {
    appointments = await getCalendarAppointments({
      tenantId: tenant.id,
      startsBefore: monthRange.end,
      endsAfter: monthRange.start,
    });
  } catch {
    appointments = [];
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Calendar"
        description={`Times in ${timeZone}`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Calendar" },
        ]}
      />

      <AppointmentCalendar
        tenantSlug={tenantSlug}
        timeZone={timeZone}
        today={today}
        initialAppointments={appointments}
        initialRangeStart={monthRange.start}
        initialRangeEnd={monthRange.end}
        locations={activeLocations.map((l) => ({ id: l.id, name: l.name }))}
        resources={activeResources.map((r) => ({ id: r.id, name: r.name }))}
        canEdit={canEdit}
      />
    </Stack>
  );
}
