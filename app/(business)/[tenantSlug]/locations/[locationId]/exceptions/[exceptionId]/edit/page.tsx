import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getLocation } from "@/features/locations/services/get-location";
import { getLocationScheduleException } from "@/features/schedule-exceptions/services/get-location-schedule-exception";
import ScheduleExceptionForm from "@/features/schedule-exceptions/components/schedule-exception-form";
import { updateLocationScheduleExceptionAction } from "@/features/schedule-exceptions/actions/update-location-schedule-exception";
import type { ScheduleExceptionFormValues } from "@/features/schedule-exceptions/schemas/location-schedule-exception-schema";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function EditExceptionPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; locationId: string; exceptionId: string }>;
}) {
  const { tenantSlug, locationId, exceptionId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const location = await getLocation(tenant.id, locationId);
  if (!location) {
    notFound();
  }

  const exception = await getLocationScheduleException(tenant.id, locationId, exceptionId);
  if (!exception) {
    notFound();
  }

  const today = new Date().toISOString().split("T")[0]!;
  const isPastDate = exception.exceptionDate < today;

  const initialValues: ScheduleExceptionFormValues = {
    name: exception.name,
    exceptionDate: exception.exceptionDate,
    isClosed: exception.isClosed,
    opensAt: exception.opensAt,
    closesAt: exception.closesAt,
    notes: exception.notes ?? "",
  };

  async function handleSubmit(values: ScheduleExceptionFormValues) {
    "use server";
    return updateLocationScheduleExceptionAction(tenantSlug, locationId, exceptionId, values);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/locations/${locationId}/exceptions`} variant="body2">
          &larr; Back to Exceptions
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Edit Exception: {exception.name}
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ScheduleExceptionForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          canEdit={canEdit}
          isPastDate={isPastDate}
        />
      </Paper>
    </Box>
  );
}
