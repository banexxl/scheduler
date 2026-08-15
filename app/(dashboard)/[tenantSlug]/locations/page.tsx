import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import LocationList from "@/features/locations/components/location-list";
import PageHeader from "@/features/platform/components/page-header";

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
    return <Alert severity="error">Unable to load locations.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Locations"
        description={`${locations.length} location${locations.length !== 1 ? "s" : ""}`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Locations" },
        ]}
        action={
          canEdit ? (
            <Button
              href={`/${tenantSlug}/locations/new`}
              variant="contained"
              size="small"
            >
              Add Location
            </Button>
          ) : undefined
        }
      />

      <LocationList locations={locations} tenantSlug={tenantSlug} canEdit={canEdit} />
    </Stack>
  );
}
