import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import StaffClientPage from "./client-page";

export async function generateMetadata() {
  return { title: "Choose Staff" };
}

/**
 * Staff Selection Page — Milestone 17.0.
 *
 * Shows staff members eligible for the selected services.
 * Includes "Any Available" option.
 * Data loaded client-side based on booking context (selected services).
 */
export default async function StaffPage({
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

  return (
    <StaffClientPage
      tenantSlug={tenantSlug}
      tenantId={ctx.tenant.id}
    />
  );
}
