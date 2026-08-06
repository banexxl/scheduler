import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getLocationExceptionById } from "@/features/locations/services/get-location-schedule-exceptions";
import LocationScheduleExceptionForm from "@/features/locations/components/location-schedule-exception-form";
import { updateLocationExceptionAction } from "@/features/locations/actions/location-exception-actions";

export default async function EditExceptionPage({ params }: { params: Promise<{ tenantSlug: string; locationId: string; exceptionId: string }> }) {
  const { tenantSlug, locationId, exceptionId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const exception = await getLocationExceptionById(tenant.id, exceptionId);
  if (!exception) notFound();

  const initialValues = {
    locationId,
    exceptionDate: exception.exceptionDate,
    exceptionType: exception.exceptionType,
    title: exception.title ?? "",
    notes: exception.notes ?? "",
    isActive: exception.isActive,
    periods: exception.periods.map((p) => ({
      startTime: p.startTime,
      endTime: p.endTime,
      sortOrder: p.sortOrder,
    })),
  };

  async function handleSubmit(values: Record<string, unknown>) {
    "use server";
    return updateLocationExceptionAction(tenantSlug, exceptionId, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/locations/${locationId}/edit`} variant="body2">
          &larr; Back to Location
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Edit Exception{exception.title ? `: ${exception.title}` : ""}
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <LocationScheduleExceptionForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Save Changes" canEdit={true} />
      </Paper>
    </Box>
  );
}
