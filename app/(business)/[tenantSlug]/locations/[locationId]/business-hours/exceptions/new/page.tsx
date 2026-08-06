import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import LocationScheduleExceptionForm from "@/features/locations/components/location-schedule-exception-form";
import { createLocationExceptionAction } from "@/features/locations/actions/location-exception-actions";

export default async function NewExceptionPage({ params }: { params: Promise<{ tenantSlug: string; locationId: string }> }) {
  const { tenantSlug, locationId } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const today = new Date().toISOString().split("T")[0] ?? "";

  const initialValues = {
    locationId,
    exceptionDate: today,
    exceptionType: "closed" as const,
    title: "",
    notes: "",
    isActive: true,
    periods: [] as Array<{ startTime: string; endTime: string; sortOrder: number }>,
  };

  async function handleSubmit(values: Record<string, unknown>) {
    "use server";
    return createLocationExceptionAction(tenantSlug, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/locations/${locationId}/edit`} variant="body2">
          &larr; Back to Location
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Add Schedule Exception</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <LocationScheduleExceptionForm initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Create Exception" canEdit={true} />
      </Paper>
    </Box>
  );
}
