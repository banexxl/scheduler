import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import LocationForm from "@/features/locations/components/location-form";
import { createLocationAction } from "@/features/locations/actions/create-location";
import type { LocationFormValues } from "@/features/locations/schemas/location-schema";

export default async function NewLocationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  // Load business default timezone
  let defaultTimezone = "Europe/Belgrade";
  try {
    const settings = await getBusinessSettings(tenant.id);
    defaultTimezone = settings.defaultTimezone;
  } catch {
    // Use fallback
  }

  const initialValues: LocationFormValues = {
    name: "",
    slug: "",
    locationType: "physical",
    description: "",
    streetAddress: "",
    city: "",
    provinceState: "",
    country: "",
    postalCode: "",
    phoneNumber: "",
    email: "",
    timezone: defaultTimezone,
    isActive: true,
  };

  async function handleSubmit(values: LocationFormValues) {
    "use server";
    return createLocationAction(tenantSlug, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/locations`} variant="body2">
          &larr; Back to Locations
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Add Location
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <LocationForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Create Location"
          canEdit={true}
        />
      </Paper>
    </Box>
  );
}
