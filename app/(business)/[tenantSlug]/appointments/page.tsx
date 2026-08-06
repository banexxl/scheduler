import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getAppointmentsList } from "@/features/appointments/services/appointment-queries";
import AppointmentListTable from "@/features/appointments/components/appointment-list-table";

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

  // Parse filter params
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
    return (
      <Box>
        <Alert severity="error">Unable to load appointments.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Appointments
        </Typography>
        {canEdit && (
          <Button
            component={NextLink}
            href={`/${tenantSlug}/appointments/new`}
            variant="contained"
          >
            New Appointment
          </Button>
        )}
      </Box>

      <AppointmentListTable
        appointments={result.items}
        total={result.total}
        tenantSlug={tenantSlug}
        canEdit={canEdit}
        filters={filters}
      />
    </Box>
  );
}
