import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getResource } from "@/features/resources/services/get-business-resources";
import { getResourceTypes } from "@/features/resources/services/get-resource-types";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getServicesForResource } from "@/features/services/services/get-service-resources";
import ResourceForm from "@/features/resources/components/resource-form";
import ResourceAssignedServices from "@/features/services/components/resource-assigned-services";
import { updateResourceAction } from "@/features/resources/actions/update-resource";
import type { ResourceFormValues } from "@/features/resources/schemas/resource-schema";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function EditResourcePage({ params }: { params: Promise<{ tenantSlug: string; resourceId: string }> }) {
  const { tenantSlug, resourceId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const [resource, types, locations, assignedServices] = await Promise.all([
    getResource(tenant.id, resourceId),
    getResourceTypes(tenant.id),
    getBusinessLocations(tenant.id),
    getServicesForResource(tenant.id, resourceId),
  ]);

  if (!resource) notFound();

  const primaryLoc = resource.locations.find((l) => l.isPrimary);

  const initialValues: ResourceFormValues = {
    name: resource.name, slug: resource.slug, resourceTypeId: resource.resourceTypeId,
    description: resource.description ?? "", email: resource.email ?? "", phoneNumber: resource.phoneNumber ?? "",
    isActive: resource.isActive,
    locationIds: resource.locations.map((l) => l.locationId),
    primaryLocationId: primaryLoc?.locationId ?? resource.locations[0]?.locationId ?? "",
  };

  async function handleSubmit(values: ResourceFormValues) { "use server"; return updateResourceAction(tenantSlug, resourceId, values); }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/resources`} variant="body2">&larr; Back to Resources</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Edit Resource: {resource.name}</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ResourceForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Save Changes" canEdit={canEdit} resourceTypes={types} locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Assigned Services</Typography>
        <ResourceAssignedServices services={assignedServices} tenantSlug={tenantSlug} />
      </Paper>
    </Box>
  );
}
