import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import ResourceTimeOffForm from "@/features/resources/components/resource-time-off-form";
import { createResourceTimeOffAction } from "@/features/resources/actions/resource-time-off-actions";

export default async function NewTimeOffPage({ params }: { params: Promise<{ tenantSlug: string; resourceId: string }> }) {
  const { tenantSlug, resourceId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const locations = await getBusinessLocations(tenant.id);

  const today = new Date().toISOString().split("T")[0] ?? "";

  const initialValues = {
    resourceId,
    locationId: "",
    title: "",
    notes: "",
    isAllDay: true,
    startDate: today,
    endDate: today,
    startTime: "",
    endTime: "",
  };

  async function handleSubmit(values: Record<string, unknown>) {
    "use server";
    return createResourceTimeOffAction(tenantSlug, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/resources/${resourceId}/edit`} variant="body2">
          &larr; Back to Resource
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Add Time Off</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ResourceTimeOffForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Create Time Off"
          canEdit={true}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </Paper>
    </Box>
  );
}
