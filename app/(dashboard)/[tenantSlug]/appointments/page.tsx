import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getAppointmentsList } from "@/features/appointments/services/appointment-queries";
import AppointmentListTable from "@/features/appointments/components/appointment-list-table";
import PageHeader from "@/features/platform/components/page-header";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const filters = {
    status: query.status || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    locationId: query.locationId || undefined,
    resourceId: query.resourceId || undefined,
    serviceId: query.serviceId || undefined,
    customerSearch: query.q || undefined,
  };

  let result;
  try {
    result = await getAppointmentsList(
      tenant.id,
      filters as Parameters<typeof getAppointmentsList>[1],
      50,
      0
    );
  } catch {
    return <Alert severity="error">Unable to load appointments.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Appointments"
        description={`${result.total} appointment${result.total !== 1 ? "s" : ""}`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Appointments" },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              href={`/${tenantSlug}/appointments/today`}
              variant="outlined"
              size="small"
            >
              Today
            </Button>
            {canEdit && (
              <Button
                href={`/${tenantSlug}/appointments/new`}
                variant="contained"
                size="small"
              >
                New Appointment
              </Button>
            )}
          </Stack>
        }
      />

      <AppointmentListTable
        appointments={result.items}
        total={result.total}
        tenantSlug={tenantSlug}
        canEdit={canEdit}
        filters={filters}
      />
    </Stack>
  );
}
