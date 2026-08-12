import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
import { getCalendarAppointments } from "@/features/calendar/services/get-calendar-appointments";
import { parseCalendarFilters } from "@/features/calendar/schemas/calendar-query-schema";
import {
  getTenantToday,
  getTenantDayRange,
  getTenantWeekRange,
} from "@/lib/scheduling/calendar-utils";
import AppointmentCalendar from "@/features/calendar/components/appointment-calendar";
import PageHeader from "@/features/platform/components/page-header";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = ["owner", "admin"].includes(membership.role);

  // Load tenant timezone
  const tenantData = await loadTenantTimezone(tenant.id);
  if (!tenantData) {
    return <Alert severity="error">Unable to load tenant configuration.</Alert>;
  }
  const timeZone = tenantData.defaultTimezone;
  const today = getTenantToday(new Date(), timeZone);

  // Parse calendar filters from URL
  const filters = parseCalendarFilters(query, today);

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

  // Filter resources by selected location
  const filteredResources = filters.locationId
    ? activeResources.filter((r) =>
      r.locations.some(
        (rl) => rl.locationId === filters.locationId && rl.isActive
      )
    )
    : activeResources;

  // Determine date range
  let rangeStart: string;
  let rangeEnd: string;

  if (filters.view === "week") {
    const weekRange = getTenantWeekRange(filters.date, timeZone);
    rangeStart = weekRange.start;
    rangeEnd = weekRange.end;
  } else {
    const dayRange = getTenantDayRange(filters.date, timeZone);
    rangeStart = dayRange.start;
    rangeEnd = dayRange.end;
  }

  const statuses: AppointmentStatus[] | undefined = filters.status
    ? [filters.status]
    : undefined;

  // Load appointments
  let appointments: import("@/features/calendar/types/calendar").CalendarAppointment[];
  try {
    appointments = await getCalendarAppointments({
      tenantId: tenant.id,
      startsBefore: rangeEnd,
      endsAfter: rangeStart,
      locationId: filters.locationId,
      resourceId: filters.resourceId,
      statuses,
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
        appointments={appointments}
        locations={activeLocations.map((l) => ({ id: l.id, name: l.name }))}
        resources={filteredResources.map((r) => ({ id: r.id, name: r.name }))}
        filters={filters}
        canEdit={canEdit}
      />
    </Stack>
  );
}
