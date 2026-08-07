import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import ResourceList from "@/features/resources/components/resource-list";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ResourcesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let resources;
  try { resources = await getBusinessResources(tenant.id); }
  catch { return <Box><Alert severity="error">Unable to load resources.</Alert></Box>; }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Resources</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Link component="a" href={`/${tenantSlug}/resources/types`} variant="body2" sx={{ alignSelf: "center" }}>Manage Types</Link>
          {canEdit && <Button component="a" href={`/${tenantSlug}/resources/new`} variant="contained">Add Resource</Button>}
        </Box>
      </Box>
      <ResourceList resources={resources} tenantSlug={tenantSlug} canEdit={canEdit} />
    </Box>
  );
}
