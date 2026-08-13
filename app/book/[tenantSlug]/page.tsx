import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getPublicBookableServices } from "@/features/public-booking/services/public-service-discovery";
import { resolvePublicSite } from "@/features/public-site/services/public-site-resolver";
import { clientEnvironment } from "@/lib/environment/client";
import PublicBookingFlow from "@/features/public-booking/components/public-booking-flow";
import JsonLdScript from "@/features/public-site/components/json-ld-script";
import { buildLocalBusinessJsonLd, buildFaqJsonLd } from "@/features/public-site/utils/structured-data";
import {
  HeroSection,
  ServicesSection,
  AboutSection,
  StaffSection,
  GallerySection,
  ReviewsSection,
  LocationsSection,
  FaqSection,
  GiftCardsSection,
  ContactSection,
  PublicSiteNav,
  PublicSiteFooter,
} from "@/features/public-site/components/public-site-sections";

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const siteResult = await resolvePublicSite(tenantSlug);

  if (siteResult.status !== "ok" || !siteResult.data) {
    return { title: "Book an Appointment" };
  }

  const { tenant, config } = siteResult.data;
  const title = config.seo.metaTitle || `${tenant.name} — Book Online`;
  const description = config.seo.metaDescription || tenant.description || `Book an appointment with ${tenant.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

/**
 * Public Booking Storefront — Milestones 15.12, 15.13.
 *
 * Renders the tenant public website using published site config.
 * Sections are driven by config ordering and enabled state.
 * Falls back to sensible defaults when no site config is published.
 */
export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve booking context (for the wizard)
  const bookingContext = await resolvePublicBookingContext(tenantSlug);
  if (!bookingContext) {
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

  const { tenant: bookingTenant, settings } = bookingContext;

  // Resolve public site data (config, services, staff, reviews, gallery, locations)
  const siteResult = await resolvePublicSite(tenantSlug);

  // Load bookable services for the wizard
  let bookableServices: Awaited<ReturnType<typeof getPublicBookableServices>>;
  try {
    bookableServices = await getPublicBookableServices(bookingTenant.id);
  } catch {
    bookableServices = [];
  }

  // Use site data if available, otherwise render minimal fallback
  const site = siteResult.data;
  if (!site) {
    // Minimal fallback (no site config published yet)
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
        <Box sx={{ bgcolor: "#2563eb", color: "#fff", py: 5, px: 3, textAlign: "center" }}>
          <Typography component="h1" sx={{ fontSize: "1.75rem", fontWeight: 700, mb: 1 }}>{bookingTenant.name}</Typography>
          {bookingTenant.description && <Typography sx={{ opacity: 0.9 }}>{bookingTenant.description}</Typography>}
        </Box>
        <Box id="booking" sx={{ maxWidth: 600, mx: "auto", px: 2, py: 4 }}>
          <PublicBookingFlow
            tenantSlug={tenantSlug}
            tenant={bookingTenant}
            timeZone={bookingTenant.defaultTimeZone}
            settings={settings}
            services={bookableServices}
            giftCardsEnabled={false}
          />
        </Box>
      </Box>
    );
  }

  const { tenant, theme, config, services, locations, staff, reviews, gallery, features } = site;
  const supabaseUrl = clientEnvironment.supabaseUrl;

  // Build section renderer map
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    services: () => <ServicesSection config={config} services={services} tenantSlug={tenantSlug} theme={theme} />,
    about: () => <AboutSection config={config} />,
    staff: () => <StaffSection staff={staff} tenantSlug={tenantSlug} theme={theme} />,
    gallery: () => <GallerySection gallery={gallery} supabaseUrl={supabaseUrl} />,
    reviews: () => <ReviewsSection reviews={reviews} />,
    locations: () => <LocationsSection locations={locations} tenantSlug={tenantSlug} theme={theme} />,
    gift_cards: () => <GiftCardsSection tenantSlug={tenantSlug} theme={theme} enabled={features.giftCardsEnabled} />,
    faq: () => <FaqSection faq={config.faq} />,
    contact: () => <ContactSection tenant={tenant} locations={locations} socialLinks={tenant.socialLinks} />,
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.backgroundColor }}>
      {/* Navigation */}
      <PublicSiteNav
        tenant={tenant}
        sections={config.sections}
        theme={theme}
        tenantSlug={tenantSlug}
        bookingEnabled={features.publicBookingEnabled}
      />

      {/* Hero */}
      <HeroSection tenant={tenant} config={config} theme={theme} />

      {/* Dynamic sections in config order */}
      {config.sections
        .filter(section => section.enabled)
        .map(section => {
          const renderer = sectionRenderers[section.type];
          if (!renderer) return null;
          return <Box key={section.type}>{renderer()}</Box>;
        })}

      {/* Booking Wizard */}
      {features.publicBookingEnabled && bookableServices.length > 0 && (
        <Box id="booking" sx={{ maxWidth: 600, mx: "auto", px: 2, py: 5 }}>
          <Typography component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
            Book an Appointment
          </Typography>
          <PublicBookingFlow
            tenantSlug={tenantSlug}
            tenant={bookingTenant}
            timeZone={bookingTenant.defaultTimeZone}
            settings={settings}
            services={bookableServices}
            giftCardsEnabled={features.giftCardsEnabled}
          />
        </Box>
      )}

      {/* Footer */}
      <PublicSiteFooter tenant={tenant} />

      {/* JSON-LD Structured Data */}
      <JsonLdScript data={buildLocalBusinessJsonLd({ tenant, locations, reviews, tenantSlug })} />
      {config.faq.length > 0 && (() => {
        const faqLd = buildFaqJsonLd(config.faq);
        return faqLd ? <JsonLdScript data={faqLd} /> : null;
      })()}
    </Box>
  );
}
