import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getPublicBookableServices } from "@/features/public-booking/services/public-service-discovery";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import { isFeatureEnabled } from "@/features/platform/services/feature-override-service";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PublicBookingFlow from "@/features/public-booking/components/public-booking-flow";

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) return { title: "Book an Appointment" };
  return {
    title: context.settings.bookingPageTitle ?? `Book with ${context.tenant.name}`,
    description: context.settings.bookingPageDescription ?? `Book an appointment with ${context.tenant.name}`,
    openGraph: {
      title: context.settings.bookingPageTitle ?? `Book with ${context.tenant.name}`,
      description: context.settings.bookingPageDescription ?? `Schedule your visit`,
      type: "website",
    },
  };
}

/**
 * Public Booking Storefront + Wizard — Milestone 15.12.
 *
 * Combines a polished business landing (hero, services, CTA)
 * with the existing multi-step booking wizard below.
 * Mobile-first, branded, accessible.
 */
export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ p: 4, maxWidth: 420, textAlign: "center", bgcolor: "#fff", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <Typography variant="h6" gutterBottom>Online Booking Unavailable</Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Online booking is currently unavailable for this business. Please contact them directly.
          </Typography>
        </Box>
      </Box>
    );
  }

  const { tenant, settings } = context;
  const theme = await resolvePublishedTenantTheme(tenant.id);

  // Load services
  let services;
  try {
    services = await getPublicBookableServices(tenant.id);
  } catch {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ p: 4, maxWidth: 420, textAlign: "center", bgcolor: "#fff", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <Typography variant="h6" gutterBottom>Something went wrong</Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#6b7280" }}>Unable to load booking information.</Typography>
        </Box>
      </Box>
    );
  }

  if (services.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ p: 4, maxWidth: 420, textAlign: "center", bgcolor: "#fff", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <Typography variant="h6" gutterBottom>{tenant.name}</Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#6b7280" }}>No services are currently available for booking.</Typography>
        </Box>
      </Box>
    );
  }

  // Check feature availability for gift cards
  const giftCardsEnabled = await isFeatureEnabled(tenant.id, "gift_cards");

  // Load review summary
  const supabase = createServiceRoleClient();
  const { count: reviewCount } = await supabase
    .from("customer_reviews")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("status", "published");

  const { data: avgRatingRow } = await supabase
    .from("customer_reviews")
    .select("rating")
    .eq("tenant_id", tenant.id)
    .eq("status", "published")
    .limit(100);

  const avgRating = avgRatingRow && avgRatingRow.length > 0
    ? Math.round((avgRatingRow.reduce((sum, r) => sum + (r as { rating: number }).rating, 0) / avgRatingRow.length) * 10) / 10
    : null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: theme.primaryColor,
          color: "#fff",
          py: { xs: 4, md: 6 },
          px: 3,
          textAlign: "center",
        }}
      >
        <Typography
          component="h1"
          sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700, mb: 1 }}
        >
          {tenant.name}
        </Typography>
        {tenant.description && (
          <Typography sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, opacity: 0.9, maxWidth: 600, mx: "auto", mb: 2 }}>
            {tenant.description}
          </Typography>
        )}
        {avgRating !== null && (
          <Typography sx={{ fontSize: "0.8125rem", opacity: 0.85 }}>
            ★ {avgRating} ({reviewCount} review{(reviewCount ?? 0) !== 1 ? "s" : ""})
          </Typography>
        )}
        <Button
          href="#booking"
          variant="contained"
          size="large"
          sx={{
            mt: 2,
            bgcolor: "#fff",
            color: theme.primaryColor,
            fontWeight: 700,
            "&:hover": { bgcolor: "#f0f0f0" },
            borderRadius: `${theme.borderRadius}px`,
          }}
        >
          Book Now
        </Button>
      </Box>

      {/* Services Preview */}
      <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 4 }}>
        <Typography component="h2" sx={{ fontSize: "1.125rem", fontWeight: 700, mb: 2, textAlign: "center" }}>
          Our Services
        </Typography>
        <Grid container spacing={1.5}>
          {services.slice(0, 6).map((service) => (
            <Grid key={service.id} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid #e5e7eb" }}>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{service.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {settings.showServiceDuration && (
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>{service.durationMinutes} min</Typography>
                  )}
                  {settings.showServicePrices && Number(service.price) > 0 && (
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {service.price} {service.currency}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
        {services.length > 6 && (
          <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", textAlign: "center", mt: 1 }}>
            +{services.length - 6} more services
          </Typography>
        )}
      </Box>

      {/* Gift Cards CTA */}
      {giftCardsEnabled && (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Button href={`/book/${tenantSlug}/gift-cards`} variant="outlined" size="small" sx={{ borderRadius: `${theme.borderRadius}px` }}>
            🎁 Buy a Gift Card
          </Button>
        </Box>
      )}

      {/* Booking Wizard */}
      <Box id="booking" sx={{ maxWidth: 600, mx: "auto", px: 2, py: 4 }}>
        <PublicBookingFlow
          tenantSlug={tenantSlug}
          tenant={tenant}
          timeZone={tenant.defaultTimeZone}
          settings={settings}
          services={services}
          giftCardsEnabled={giftCardsEnabled}
        />
      </Box>

      {/* Footer */}
      <Box sx={{ textAlign: "center", py: 3, borderTop: "1px solid #e5e7eb" }}>
        <Typography sx={{ fontSize: "0.6875rem", color: "#9ca3af" }}>
          Powered by get-slot.app
        </Typography>
      </Box>
    </Box>
  );
}
