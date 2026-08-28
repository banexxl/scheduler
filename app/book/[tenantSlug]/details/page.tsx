import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import DetailsClientPage from "./client-page";

export async function generateMetadata() {
  return { title: "Your Details" };
}

/**
 * Customer Details Page — Milestone 17.2.
 */
export default async function DetailsPage({
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

  return <DetailsClientPage tenantSlug={tenantSlug} tenantId={ctx.tenant.id} />;
}
