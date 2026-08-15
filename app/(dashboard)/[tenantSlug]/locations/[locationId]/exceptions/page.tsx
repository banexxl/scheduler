import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getLocation } from "@/features/locations/services/get-location";
import { getLocationScheduleExceptions } from "@/features/schedule-exceptions/services/get-location-schedule-exceptions";
import ScheduleExceptionList from "@/features/schedule-exceptions/components/schedule-exception-list";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ExceptionsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; locationId: string }>;
}) {
  const { tenantSlug, locationId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const location = await getLocation(tenant.id, locationId);
  if (!location) {
    notFound();
  }

  let exceptions;
  try {
    exceptions = await getLocationScheduleExceptions(tenant.id, locationId);
  } catch {
    return (
      <Box>
        <Alert severity="error">Unable to load schedule exceptions.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/locations`} variant="body2">
          &larr; Back to Locations
        </Link>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Schedule Exceptions
          </Typography>
          <Chip label={location.name} variant="outlined" size="small" />
        </Box>
        {canEdit && (
          <Button
            component="a"
            href={`/${tenantSlug}/locations/${locationId}/exceptions/new`}
            variant="contained"
          >
            Add Exception
          </Button>
        )}
      </Box>

      <ScheduleExceptionList
        exceptions={exceptions}
        tenantSlug={tenantSlug}
        locationId={locationId}
        canEdit={canEdit}
      />
    </Box>
  );
}
