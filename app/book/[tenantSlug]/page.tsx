import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getPublicBookableServices } from "@/features/public-booking/services/public-service-discovery";
import { resolvePublicSite } from "@/features/public-site/services/public-site-resolver";
import { getPublicHomepageData } from "@/features/homepage-builder/actions/homepage-actions";
import PublicBookingFlow from "@/features/public-booking/components/public-booking-flow";
import JsonLdScript from "@/features/public-site/components/json-ld-script";
import { buildLocalBusinessJsonLd, buildFaqJsonLd } from "@/features/public-site/utils/structured-data";
import {
  ReviewsSection,
  LocationsSection,
  FaqSection,
  GiftCardsSection,
  ContactSection,
} from "@/features/public-site/components/public-site-sections";
import HomepageAbout from "@/features/customer-portal/components/HomepageAbout";
import HomepageGallery from "@/features/customer-portal/components/HomepageGallery";
import HomepageTestimonials from "@/features/customer-portal/components/HomepageTestimonials";
import ServicesPreview from "@/features/customer-portal/components/ServicesPreview";
import StaffPreview from "@/features/customer-portal/components/StaffPreview";
import type { HomepageSectionId } from "@/features/homepage-builder/types";

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
 * Public Booking Storefront — Milestones 15.12, 15.13, 16.4.
 *
 * Renders the tenant public homepage with dynamic sections from
 * tenant_homepage content builder. Section order and visibility
 * are driven by the homepage builder config.
 *
 * The Hero, Header, CTA, and Footer are rendered by the template shell
 * (Milestone 16.3) — this page only renders the content sections between them.
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 3, minHeight: "40vh" }}>
        <Box sx={{ p: 4, maxWidth: 420, textAlign: "center", bgcolor: "background.paper", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <Typography variant="h6" gutterBottom>Online Booking Unavailable</Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            Online booking is currently unavailable for this business. Please contact them directly.
          </Typography>
        </Box>
      </Box>
    );
  }

  const { tenant: bookingTenant, settings } = bookingContext;

  // Resolve public site data (services, staff, reviews, locations, etc.)
  const siteResult = await resolvePublicSite(tenantSlug);

  // Load homepage content builder data
  const homepageData = await getPublicHomepageData(bookingTenant.id);

  // Load bookable services for the wizard
  let bookableServices: Awaited<ReturnType<typeof getPublicBookableServices>>;
  try {
    bookableServices = await getPublicBookableServices(bookingTenant.id);
  } catch {
    bookableServices = [];
  }

  const site = siteResult.data;
  const { content, gallery, testimonials } = homepageData;
  const { sectionOrder, sectionVisibility } = content;

  // Extract site data for sections that need it
  const services = site?.services ?? [];
  const staff = site?.staff ?? [];
  const locations = site?.locations ?? [];
  const reviews = site?.reviews ?? { reviews: [], summary: null };
  const features = site?.features ?? { publicBookingEnabled: true, giftCardsEnabled: false, onlinePaymentsEnabled: false };
  const config = site?.config;
  const tenant = site?.tenant;
  const theme = site?.theme;

  // Build section renderer map (homepage-builder driven sections)
  const sectionRenderers: Record<HomepageSectionId, (() => React.ReactNode) | null> = {
    hero: null, // Rendered by template shell (Milestone 16.3)
    about: () => <HomepageAbout content={content} />,
    services: () => <ServicesPreview services={services} tenantSlug={tenantSlug} />,
    staff: () => <StaffPreview staff={staff} />,
    gallery: () => <HomepageGallery images={gallery} />,
    testimonials: () => <HomepageTestimonials testimonials={testimonials} />,
    cta: null, // Rendered by template shell (Milestone 16.3)
  };

  return (
    <>
      {/* Dynamic sections in homepage builder order */}
      {sectionOrder
        .filter((id) => sectionVisibility[id])
        .map((id) => {
          const renderer = sectionRenderers[id];
          if (!renderer) return null;
          return <Box key={id}>{renderer()}</Box>;
        })}

      {/* Legacy site config sections (reviews, locations, FAQ, gift cards, contact) */}
      {config && tenant && theme && (
        <>
          {config.sections
            .filter((s) => s.enabled && !["services", "about", "staff", "gallery"].includes(s.type))
            .map((section) => {
              const legacyRenderers: Record<string, () => React.ReactNode> = {
                reviews: () => <ReviewsSection reviews={reviews} />,
                locations: () => <LocationsSection locations={locations} tenantSlug={tenantSlug} theme={theme} />,
                gift_cards: () => <GiftCardsSection tenantSlug={tenantSlug} theme={theme} enabled={features.giftCardsEnabled} />,
                faq: () => <FaqSection faq={config.faq} />,
                contact: () => <ContactSection tenant={tenant} locations={locations} socialLinks={tenant.socialLinks} />,
              };
              const renderer = legacyRenderers[section.type];
              if (!renderer) return null;
              return <Box key={section.type}>{renderer()}</Box>;
            })}
        </>
      )}

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

      {/* JSON-LD Structured Data */}
      {tenant && locations && (
        <JsonLdScript data={buildLocalBusinessJsonLd({ tenant, locations, reviews, tenantSlug })} />
      )}
      {config && config.faq.length > 0 && (() => {
        const faqLd = buildFaqJsonLd(config.faq);
        return faqLd ? <JsonLdScript data={faqLd} /> : null;
      })()}
    </>
  );
}
