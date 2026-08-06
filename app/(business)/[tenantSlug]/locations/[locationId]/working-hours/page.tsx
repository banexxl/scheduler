import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getLocation } from "@/features/locations/services/get-location";
import { getLocationWorkingHours } from "@/features/working-hours/services/get-location-working-hours";
import WorkingHoursForm from "@/features/working-hours/components/working-hours-form";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function WorkingHoursPage({
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

  const workingHours = await getLocationWorkingHours(locationId);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/locations`} variant="body2">
          &larr; Back to Locations
        </Link>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Working Hours
        </Typography>
        <Chip label={location.name} variant="outlined" size="small" />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Timezone: {location.timezone}
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 } }}>
        {workingHours ? (
          <WorkingHoursForm
            initialDays={workingHours}
            tenantSlug={tenantSlug}
            locationId={locationId}
            canEdit={canEdit}
          />
        ) : (
          <Alert severity="warning">
            Working hours not configured. This may indicate incomplete location data.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
