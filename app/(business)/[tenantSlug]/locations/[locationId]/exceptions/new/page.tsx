import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getLocation } from "@/features/locations/services/get-location";
import ScheduleExceptionForm from "@/features/schedule-exceptions/components/schedule-exception-form";
import { createLocationScheduleExceptionAction } from "@/features/schedule-exceptions/actions/create-location-schedule-exception";
import type { ScheduleExceptionFormValues } from "@/features/schedule-exceptions/schemas/location-schedule-exception-schema";

export default async function NewExceptionPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; locationId: string }>;
}) {
  const { tenantSlug, locationId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const location = await getLocation(tenant.id, locationId);
  if (!location) {
    notFound();
  }

  const initialValues: ScheduleExceptionFormValues = {
    name: "",
    exceptionDate: "",
    isClosed: true,
    opensAt: null,
    closesAt: null,
    notes: "",
  };

  async function handleSubmit(values: ScheduleExceptionFormValues) {
    "use server";
    return createLocationScheduleExceptionAction(tenantSlug, locationId, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/locations/${locationId}/exceptions`} variant="body2">
          &larr; Back to Exceptions
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Add Schedule Exception — {location.name}
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ScheduleExceptionForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Create Exception"
          canEdit={true}
        />
      </Paper>
    </Box>
  );
}
