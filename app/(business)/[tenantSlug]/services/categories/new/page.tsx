import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import ServiceCategoryForm from "@/features/service-categories/components/service-category-form";
import { createServiceCategoryAction } from "@/features/service-categories/actions/create-service-category";
import type { ServiceCategoryFormValues } from "@/features/service-categories/schemas/service-category-schema";

export default async function NewCategoryPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const initialValues: ServiceCategoryFormValues = { name: "", slug: "", description: "", isActive: true };

  async function handleSubmit(values: ServiceCategoryFormValues) { "use server"; return createServiceCategoryAction(tenantSlug, values); }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/services/categories`} variant="body2">&larr; Back to Categories</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Create Service Category</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ServiceCategoryForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Create Category" canEdit={true} />
      </Paper>
    </Box>
  );
}
