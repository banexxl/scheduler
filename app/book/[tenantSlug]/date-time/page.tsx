import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import DateTimeClientPage from "./client-page";

export async function generateMetadata() {
  return { title: "Choose Date & Time" };
}

/**
 * Date & Time Selection Page — Milestone 17.1.
 *
 * Monthly calendar + time slot grid.
 * Uses the existing availability engine server-side.
 */
export default async function DateTimePage({
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
    <DateTimeClientPage
      tenantSlug={tenantSlug}
      tenantId={ctx.tenant.id}
      timeZone={ctx.tenant.defaultTimeZone}
    />
  );
}
