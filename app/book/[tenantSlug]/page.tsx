import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getPublicBookableServices } from "@/features/public-booking/services/public-service-discovery";
import PublicBookingFlow from "@/features/public-booking/components/public-booking-flow";

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
  if (!context) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>Online Booking Unavailable</Typography>
          <Typography variant="body2" color="text.secondary">
            Online booking is currently unavailable for this business. Please contact them directly.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const { tenant, settings } = context;

  // Load bookable services
  let services;
  try {
    services = await getPublicBookableServices(tenant.id);
  } catch {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary">
            Unable to load booking information. Please try again later.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (services.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>{tenant.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            No services are currently available for booking. Please check back later.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <PublicBookingFlow
      tenantSlug={tenantSlug}
      tenant={tenant}
      timeZone={tenant.defaultTimeZone}
      settings={settings}
      services={services}
    />
  );
}
