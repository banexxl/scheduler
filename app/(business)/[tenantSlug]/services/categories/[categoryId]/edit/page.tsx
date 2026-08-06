import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getServiceCategory } from "@/features/service-categories/services/get-service-categories";
import ServiceCategoryForm from "@/features/service-categories/components/service-category-form";
import { updateServiceCategoryAction } from "@/features/service-categories/actions/update-service-category";
import type { ServiceCategoryFormValues } from "@/features/service-categories/schemas/service-category-schema";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function EditCategoryPage({ params }: { params: Promise<{ tenantSlug: string; categoryId: string }> }) {
  const { tenantSlug, categoryId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const category = await getServiceCategory(tenant.id, categoryId);
  if (!category) notFound();

  const initialValues: ServiceCategoryFormValues = {
    name: category.name, slug: category.slug, description: category.description ?? "", isActive: category.isActive,
  };

  async function handleSubmit(values: ServiceCategoryFormValues) { "use server"; return updateServiceCategoryAction(tenantSlug, categoryId, values); }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/services/categories`} variant="body2">&larr; Back to Categories</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Edit Category: {category.name}</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ServiceCategoryForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Save Changes" canEdit={canEdit} />
      </Paper>
    </Box>
  );
}
