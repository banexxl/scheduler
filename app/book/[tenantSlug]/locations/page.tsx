import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getAvailableLocations } from "@/features/booking/actions/booking-data-actions";
import LocationsClientPage from "./client-page";

export async function generateMetadata() {
  return { title: "Choose Location" };
}

/**
 * Location Selection Page — Milestone 17.0.
 *
 * If only one active location exists, auto-selects it and renders a
 * "continuing" state (the client page handles the auto-skip).
 */
export default async function LocationsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const ctx = await resolvePublicBookingContext(tenantSlug);

  if (!ctx) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6">Booking Unavailable</Typography>
      </Box>
    );
  }

  const locations = await getAvailableLocations(ctx.tenant.id);

  return (
    <LocationsClientPage
      tenantSlug={tenantSlug}
      locations={locations}
    />
  );
}
