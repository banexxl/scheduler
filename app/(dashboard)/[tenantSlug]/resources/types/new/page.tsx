import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import ResourceTypeForm from "@/features/resources/components/resource-type-form";
import { createResourceTypeAction } from "@/features/resources/actions/create-resource-type";
import type { ResourceTypeFormValues } from "@/features/resources/schemas/resource-type-schema";

export default async function NewResourceTypePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const initialValues: ResourceTypeFormValues = {
    name: "", slug: "", resourceKind: "person",
    displayNameSingular: "", displayNamePlural: "",
    description: "", isActive: true,
  };

  async function handleSubmit(values: ResourceTypeFormValues) { "use server"; return createResourceTypeAction(tenantSlug, values); }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component="a" href={`/${tenantSlug}/resources/types`} variant="body2">&larr; Back to Resource Types</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Create Resource Type</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ResourceTypeForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Create Type" canEdit={true} />
      </Paper>
    </Box>
  );
}
