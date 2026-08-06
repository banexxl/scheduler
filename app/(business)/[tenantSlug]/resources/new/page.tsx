import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getResourceTypes } from "@/features/resources/services/get-resource-types";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import ResourceForm from "@/features/resources/components/resource-form";
import { createResourceAction } from "@/features/resources/actions/create-resource";
import type { ResourceFormValues } from "@/features/resources/schemas/resource-schema";

export default async function NewResourcePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const [types, locations] = await Promise.all([getResourceTypes(tenant.id), getBusinessLocations(tenant.id)]);

  if (types.filter((t) => t.isActive).length === 0) {
    return (
      <Box>
        <Alert severity="info">Create a resource type first before adding resources.</Alert>
        <Link component={NextLink} href={`/${tenantSlug}/resources/types/new`} variant="body2">Create Resource Type</Link>
      </Box>
    );
  }

  const initialValues: ResourceFormValues = {
    name: "", slug: "", resourceTypeId: types.find((t) => t.isActive)?.id ?? "",
    description: "", email: "", phoneNumber: "", isActive: true,
    locationIds: locations.length > 0 ? [locations[0]!.id] : [],
    primaryLocationId: locations[0]?.id ?? "",
  };

  async function handleSubmit(values: ResourceFormValues) { "use server"; return createResourceAction(tenantSlug, values); }

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/resources`} variant="body2">&larr; Back to Resources</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Add Resource</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ResourceForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Create Resource" canEdit={true} resourceTypes={types} locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
      </Paper>
    </Box>
  );
}
