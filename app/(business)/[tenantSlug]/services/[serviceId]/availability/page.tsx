import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getService } from "@/features/services/services/get-services";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import { getLocationIdsForService } from "@/features/services/services/get-service-locations";
import AvailabilityPreviewClient from "@/features/availability/components/availability-preview-client";

export default async function ServiceAvailabilityPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; serviceId: string }>;
}) {
  const { tenantSlug, serviceId } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);

  const [service, locations, assignedLocationIds] = await Promise.all([
    getService(tenant.id, serviceId),
    getBusinessLocations(tenant.id),
    getLocationIdsForService(tenant.id, serviceId),
  ]);

  if (!service) notFound();

  // Filter to assigned active locations only
  const assignedLocations = locations.filter(
    (loc) => assignedLocationIds.includes(loc.id) && loc.isActive
  );

  // Load resources for the resource filter
  const resources = await getBusinessResources(tenant.id);
  const activeResources = resources.filter((r) => r.isActive);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/services/${serviceId}/edit`} variant="body2">
          &larr; Back to Service
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Availability Preview: {service.name}
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Preview only. These times are not reserved and may change.
      </Alert>

      <AvailabilityPreviewClient
        tenantSlug={tenantSlug}
        serviceId={serviceId}
        locations={assignedLocations.map((l) => ({ id: l.id, name: l.name }))}
        resources={activeResources.map((r) => ({ id: r.id, name: r.name }))}
      />
    </Box>
  );
}
