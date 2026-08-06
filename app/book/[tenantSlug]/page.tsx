import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getPublicBookableServices } from "@/features/public-booking/services/public-service-discovery";
import PublicBookingFlow from "@/features/public-booking/components/public-booking-flow";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) return { title: "Book an Appointment" };

  return {
    title: context.settings.bookingPageTitle ?? `Book with ${context.tenant.name}`,
    description: context.settings.bookingPageDescription ?? `Book an appointment with ${context.tenant.name}`,
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve tenant and verify public booking is enabled
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) notFound();

  const { tenant, settings } = context;

  // Load bookable services
  let services;
  try {
    services = await getPublicBookableServices(tenant.id);
  } catch {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Alert severity="error">Unable to load booking information.</Alert>
      </Box>
    );
  }

  if (services.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>{tenant.name}</Typography>
        <Typography color="text.secondary">
          No services are currently available for booking.
        </Typography>
      </Box>
    );
  }

  return (
    <PublicBookingFlow
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      tenantId={tenant.id}
      timeZone={tenant.defaultTimeZone}
      settings={settings}
      services={services}
    />
  );
}
