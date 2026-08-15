import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getServices } from "@/features/services/services/get-services";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import PageHeader from "@/features/platform/components/page-header";
import SegmentBuilderClient from "./client-page";

/**
 * New Segment — Milestone 15.6.1.
 */
export default async function NewSegmentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const [services, locations, resources] = await Promise.all([
    getServices(tenant.id),
    getBusinessLocations(tenant.id),
    getBusinessResources(tenant.id),
  ]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Create Segment"
        description="Define rules to group customers by behavior."
        breadcrumbs={[
          { label: "Customers", href: `/${tenantSlug}/customers` },
          { label: "Segments", href: `/${tenantSlug}/customers/segments` },
          { label: "New" },
        ]}
      />

      <SegmentBuilderClient
        tenantSlug={tenantSlug}
        services={services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }))}
        locations={locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name }))}
        resources={resources.filter((r) => r.isActive).map((r) => ({ id: r.id, name: r.name }))}
      />
    </Stack>
  );
}
