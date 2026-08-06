import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import LocationList from "@/features/locations/components/location-list";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let locations;
  try {
    locations = await getBusinessLocations(tenant.id);
  } catch {
    return (
      <Box>
        <Alert severity="error">Unable to load locations. Please try again later.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Locations
        </Typography>
        {canEdit && (
          <Button
            component={NextLink}
            href={`/${tenantSlug}/locations/new`}
            variant="contained"
          >
            Add Location
          </Button>
        )}
      </Box>

      <LocationList locations={locations} tenantSlug={tenantSlug} canEdit={canEdit} />
    </Box>
  );
}
