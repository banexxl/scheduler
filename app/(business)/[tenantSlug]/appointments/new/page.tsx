import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getServices } from "@/features/services/services/get-services";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import AppointmentCreateForm from "@/features/appointments/components/appointment-create-form";

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  let services;
  let locations;
  let resources;

  try {
    [services, locations, resources] = await Promise.all([
      getServices(tenant.id),
      getBusinessLocations(tenant.id),
      getBusinessResources(tenant.id),
    ]);
  } catch {
    return (
      <Box>
        <Alert severity="error">Unable to load data for appointment creation.</Alert>
      </Box>
    );
  }

  // Filter to active only
  const activeServices = services.filter((s) => s.isActive);
  const activeLocations = locations.filter((l) => l.isActive);
  const activeResources = resources.filter((r) => r.isActive);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/appointments`} variant="body2">
          &larr; Back to Appointments
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        New Appointment
      </Typography>

      <AppointmentCreateForm
        tenantSlug={tenantSlug}
        services={activeServices.map((s) => ({ id: s.id, name: s.name }))}
        locations={activeLocations.map((l) => ({ id: l.id, name: l.name }))}
        resources={activeResources.map((r) => ({ id: r.id, name: r.name }))}
      />
    </Box>
  );
}
