import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getResourceTypes } from "@/features/resources/services/get-resource-types";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import ResourceTypeList from "@/features/resources/components/resource-type-list";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ResourceTypesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let types, resources;
  try { [types, resources] = await Promise.all([getResourceTypes(tenant.id), getBusinessResources(tenant.id)]); }
  catch { return <Box><Alert severity="error">Unable to load resource types.</Alert></Box>; }

  // Count resources per type
  const resourceCounts: Record<string, number> = {};
  for (const r of resources) { resourceCounts[r.resourceTypeId] = (resourceCounts[r.resourceTypeId] ?? 0) + 1; }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Resource Types</Typography>
        {canEdit && <Button component="a" href={`/${tenantSlug}/resources/types/new`} variant="contained">Add Type</Button>}
      </Box>
      <ResourceTypeList types={types} tenantSlug={tenantSlug} canEdit={canEdit} resourceCounts={resourceCounts} />
    </Box>
  );
}
