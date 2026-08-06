import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getLocation } from "@/features/locations/services/get-location";
import LocationForm from "@/features/locations/components/location-form";
import { updateLocationAction } from "@/features/locations/actions/update-location";
import { getServicesForLocation } from "@/features/services/services/get-service-locations";
import { getLocationBusinessHours } from "@/features/locations/services/get-location-business-hours";
import { getFutureLocationExceptions } from "@/features/locations/services/get-location-schedule-exceptions";
import LocationAssignedServices from "@/features/services/components/location-assigned-services";
import LocationWeeklyHoursEditor from "@/features/locations/components/location-weekly-hours-editor";
import LocationScheduleExceptionList from "@/features/locations/components/location-schedule-exception-list";
import { setLocationBusinessHoursAction } from "@/features/locations/actions/set-location-business-hours";
import type { LocationFormValues } from "@/features/locations/schemas/location-schema";
import type { LocationBusinessHourInput } from "@/features/locations/types/location-business-hour";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; locationId: string }>;
}) {
  const { tenantSlug, locationId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const [location, assignedServices, businessHours, exceptions] = await Promise.all([
    getLocation(tenant.id, locationId),
    getServicesForLocation(tenant.id, locationId),
    getLocationBusinessHours(tenant.id, locationId),
    getFutureLocationExceptions(tenant.id, locationId),
  ]);

  if (!location) {
    notFound();
  }

  const initialValues: LocationFormValues = {
    name: location.name,
    slug: location.slug,
    locationType: location.locationType,
    description: location.description ?? "",
    streetAddress: location.streetAddress ?? "",
    city: location.city ?? "",
    provinceState: location.provinceState ?? "",
    country: location.country ?? "",
    postalCode: location.postalCode ?? "",
    phoneNumber: location.phoneNumber ?? "",
    email: location.email ?? "",
    timezone: location.timezone,
    isActive: location.isActive,
  };

  async function handleSubmit(values: LocationFormValues) {
    "use server";
    return updateLocationAction(tenantSlug, locationId, values);
  }

  async function handleBusinessHoursSave(periods: LocationBusinessHourInput[]) {
    "use server";
    return setLocationBusinessHoursAction(tenantSlug, locationId, periods);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/locations`} variant="body2">
          &larr; Back to Locations
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Edit Location: {location.name}
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <LocationForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          canEdit={canEdit}
        />
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Business Hours</Typography>
        <LocationWeeklyHoursEditor
          initialSchedule={businessHours}
          onSave={handleBusinessHoursSave}
          canEdit={canEdit}
        />
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Schedule Exceptions</Typography>
        <LocationScheduleExceptionList
          exceptions={exceptions}
          tenantSlug={tenantSlug}
          locationId={locationId}
          canEdit={canEdit}
        />
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Assigned Services</Typography>
        <LocationAssignedServices services={assignedServices} tenantSlug={tenantSlug} />
      </Paper>
    </Box>
  );
}
