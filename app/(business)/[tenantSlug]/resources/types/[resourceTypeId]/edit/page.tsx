import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getResourceType } from "@/features/resources/services/get-resource-types";
import ResourceTypeForm from "@/features/resources/components/resource-type-form";
import { updateResourceTypeAction } from "@/features/resources/actions/update-resource-type";
import type { ResourceTypeFormValues } from "@/features/resources/schemas/resource-type-schema";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function EditResourceTypePage({ params }: { params: Promise<{ tenantSlug: string; resourceTypeId: string }> }) {
  const { tenantSlug, resourceTypeId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const type = await getResourceType(tenant.id, resourceTypeId);
  if (!type) notFound();

  const initialValues: ResourceTypeFormValues = {
    name: type.name, slug: type.slug, resourceKind: type.resourceKind,
    displayNameSingular: type.displayNameSingular, displayNamePlural: type.displayNamePlural,
    description: type.description ?? "", isActive: type.isActive,
  };

  async function handleSubmit(values: ResourceTypeFormValues) { "use server"; return updateResourceTypeAction(tenantSlug, resourceTypeId, values); }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/resources/types`} variant="body2">&larr; Back to Resource Types</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Edit Resource Type: {type.name}</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ResourceTypeForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Save Changes" canEdit={canEdit} />
      </Paper>
    </Box>
  );
}
