import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getAvailableServices } from "@/features/booking/actions/booking-data-actions";
import ServicesClientPage from "./client-page";

export async function generateMetadata() {
  return { title: "Select Services" };
}

/**
 * Services Selection Page — Milestone 17.0.
 *
 * Displays active services grouped by category.
 * Multi-select with running total.
 */
export default async function ServicesPage({
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
        <Typography variant="body2" color="text.secondary">
          Online booking is not available for this business.
        </Typography>
      </Box>
    );
  }

  const data = await getAvailableServices(ctx.tenant.id);

  return (
    <ServicesClientPage
      tenantSlug={tenantSlug}
      categories={data.categories}
      uncategorized={data.uncategorized}
    />
  );
}
