import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getResourceTimeOffById } from "@/features/resources/services/get-resource-time-off";
import ResourceTimeOffForm from "@/features/resources/components/resource-time-off-form";
import { updateResourceTimeOffAction } from "@/features/resources/actions/resource-time-off-actions";

export default async function EditTimeOffPage({ params }: { params: Promise<{ tenantSlug: string; resourceId: string; timeOffId: string }> }) {
  const { tenantSlug, resourceId, timeOffId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const [locations, entry] = await Promise.all([
    getBusinessLocations(tenant.id),
    getResourceTimeOffById(tenant.id, timeOffId),
  ]);

  if (!entry) notFound();

  // Convert timestamptz back to form-friendly date/time values
  const startsAtDate = new Date(entry.startsAt);
  const endsAtDate = new Date(entry.endsAt);

  let startDate = startsAtDate.toISOString().split("T")[0];
  let endDate: string;
  let startTime = "";
  let endTime = "";

  if (entry.isAllDay) {
    // End is exclusive — subtract one day for inclusive display
    const inclusiveEnd = new Date(endsAtDate);
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
    endDate = inclusiveEnd.toISOString().split("T")[0];
  } else {
    endDate = endsAtDate.toISOString().split("T")[0];
    startTime = startsAtDate.toTimeString().slice(0, 5);
    endTime = endsAtDate.toTimeString().slice(0, 5);
  }

  const initialValues = {
    resourceId,
    locationId: entry.locationId ?? "",
    title: entry.title ?? "",
    notes: entry.notes ?? "",
    isAllDay: entry.isAllDay,
    startDate,
    endDate,
    startTime,
    endTime,
  };

  async function handleSubmit(values: Record<string, unknown>) {
    "use server";
    return updateResourceTimeOffAction(tenantSlug, timeOffId, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/resources/${resourceId}/edit`} variant="body2">
          &larr; Back to Resource
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Edit Time Off{entry.title ? `: ${entry.title}` : ""}
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ResourceTimeOffForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          canEdit={true}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </Paper>
    </Box>
  );
}
