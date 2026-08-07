import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getServiceCategories } from "@/features/service-categories/services/get-service-categories";
import ServiceCategoryList from "@/features/service-categories/components/service-category-list";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ServiceCategoriesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let categories;
  try { categories = await getServiceCategories(tenant.id); }
  catch { return <Box><Alert severity="error">Unable to load categories.</Alert></Box>; }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Service Categories</Typography>
        {canEdit && <Button component="a" href={`/${tenantSlug}/services/categories/new`} variant="contained">Add Category</Button>}
      </Box>
      <ServiceCategoryList categories={categories} tenantSlug={tenantSlug} canEdit={canEdit} />
    </Box>
  );
}
