import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getServices } from "@/features/services/services/get-services";
import { getServiceLocationCounts } from "@/features/services/services/get-service-locations";
import { getServiceResourceCounts } from "@/features/services/services/get-service-resources";
import ServiceList from "@/features/services/components/service-list";
import PageHeader from "@/features/platform/components/page-header";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ServicesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let services;
  let locationMap;
  let resourceMap;
  try {
    [services, locationMap, resourceMap] = await Promise.all([
      getServices(tenant.id),
      getServiceLocationCounts(tenant.id),
      getServiceResourceCounts(tenant.id),
    ]);
  } catch {
    return <Alert severity="error">Unable to load services.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Services"
        description={`${services.length} service${services.length !== 1 ? "s" : ""} configured`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Services" },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              href={`/${tenantSlug}/services/categories`}
              variant="text"
              size="small"
            >
              Categories
            </Button>
            {canEdit && (
              <Button
                href={`/${tenantSlug}/services/new`}
                variant="contained"
                size="small"
              >
                Add Service
              </Button>
            )}
          </Stack>
        }
      />

      <ServiceList
        services={services}
        tenantSlug={tenantSlug}
        canEdit={canEdit}
        locationMap={locationMap}
        resourceMap={resourceMap}
      />
    </Stack>
  );
}
