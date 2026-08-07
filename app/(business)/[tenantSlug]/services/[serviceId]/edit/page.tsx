import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getService } from "@/features/services/services/get-services";
import { getServiceCategories } from "@/features/service-categories/services/get-service-categories";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import { getLocationIdsForService } from "@/features/services/services/get-service-locations";
import { getResourcesForService } from "@/features/services/services/get-service-resources";
import ServiceForm from "@/features/services/components/service-form";
import { updateServiceAction } from "@/features/services/actions/update-service";
import { setServiceLocationsAction } from "@/features/services/actions/set-service-locations";
import { setServiceResourcesAction } from "@/features/services/actions/set-service-resources";
import type { ServiceFormValues } from "@/features/services/schemas/service-schema";
import type { ServiceResourceAssignmentInput } from "@/features/services/types/service-resource";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function EditServicePage({ params }: { params: Promise<{ tenantSlug: string; serviceId: string }> }) {
  const { tenantSlug, serviceId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const [service, categories, locations, resources, assignedLocationIds, assignedResourceRows] = await Promise.all([
    getService(tenant.id, serviceId),
    getServiceCategories(tenant.id),
    getBusinessLocations(tenant.id),
    getBusinessResources(tenant.id),
    getLocationIdsForService(tenant.id, serviceId),
    getResourcesForService(tenant.id, serviceId),
  ]);

  if (!service) notFound();

  const initialValues: ServiceFormValues = {
    name: service.name, slug: service.slug, serviceCategoryId: service.serviceCategoryId,
    description: service.description ?? "", durationMinutes: service.durationMinutes,
    price: service.price, currency: service.currency,
    bufferBeforeMinutes: service.bufferBeforeMinutes, bufferAfterMinutes: service.bufferAfterMinutes,
    isActive: service.isActive,
  };

  // Convert assigned resource rows to assignment input shape for the form
  const assignedResources: ServiceResourceAssignmentInput[] = assignedResourceRows.map((r) => ({
    resourceId: r.resourceId,
    isActive: r.isActive,
    durationOverrideMinutes: r.durationOverrideMinutes,
    priceOverride: r.priceOverride,
    currencyOverride: r.currencyOverride,
    bufferBeforeOverrideMinutes: r.bufferBeforeOverrideMinutes,
    bufferAfterOverrideMinutes: r.bufferAfterOverrideMinutes,
    sortOrder: r.sortOrder,
  }));

  async function handleSubmit(values: ServiceFormValues) { "use server"; return updateServiceAction(tenantSlug, serviceId, values); }

  async function handleLocationsSave(locationIds: string[]) {
    "use server";
    return setServiceLocationsAction(tenantSlug, { serviceId, locationIds });
  }

  async function handleResourcesSave(assignments: ServiceResourceAssignmentInput[]) {
    "use server";
    return setServiceResourcesAction(tenantSlug, { serviceId, assignments });
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component="a" href={`/${tenantSlug}/services`} variant="body2">&larr; Back to Services</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Edit Service: {service.name}</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ServiceForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          canEdit={canEdit}
          categories={categories}
          locations={locations}
          assignedLocationIds={assignedLocationIds}
          onLocationsSave={handleLocationsSave}
          resources={resources}
          assignedResources={assignedResources}
          onResourcesSave={handleResourcesSave}
        />
      </Paper>
    </Box>
  );
}
