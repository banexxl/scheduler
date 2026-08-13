/**
 * Public Site Section Components — Milestone 15.13.
 *
 * Server-rendered sections for the tenant public homepage.
 * Each section receives resolved public data and renders accordingly.
 *
 * Security:
 * - All content is pre-sanitized by the resolver/config validator
 * - No raw HTML rendering (text displayed via React text nodes)
 * - No user-supplied scripts/styles
 * - Only published data displayed
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Rating from "@mui/material/Rating";
import type { ResolvedTenantTheme } from "@/features/branding/types/branding-config";
import type { TenantPublicSiteConfig, FaqEntry, SocialLink } from "../types/site-config";
import type {
  PublicTenantInfo,
  PublicServiceItem,
  PublicLocationItem,
  PublicStaffItem,
  PublicReviewData,
  PublicGalleryItem,
  PublicFeatureState,
} from "../services/public-site-resolver";

// ─── Hero Section ────────────────────────────────────────────────────────────

type HeroProps = {
  tenant: PublicTenantInfo;
  config: TenantPublicSiteConfig;
  theme: ResolvedTenantTheme;
};

export function HeroSection({ tenant, config, theme }: HeroProps) {
  if (!config.hero.enabled) return null;

  const headline = config.hero.headline || tenant.name;
  const subheadline = config.hero.subheadline || tenant.description;
  const ctaLabel = config.hero.primaryCtaLabel || "Book Now";

  return (
    <Box
      component="section"
      aria-labelledby="hero-heading"
      sx={{
        bgcolor: theme.primaryColor,
        color: "#fff",
        py: { xs: 5, md: 8 },
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography
        id="hero-heading"
        component="h1"
        sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, fontWeight: 700, mb: 1, maxWidth: 700, mx: "auto" }}
      >
        {headline}
      </Typography>
      {subheadline && (
        <Typography sx={{ fontSize: { xs: "0.9rem", md: "1.125rem" }, opacity: 0.9, maxWidth: 600, mx: "auto", mb: 3 }}>
          {subheadline}
        </Typography>
      )}
      <Button
        href="#booking"
        variant="contained"
        size="large"
        sx={{
          bgcolor: "#fff",
          color: theme.primaryColor,
          fontWeight: 700,
          "&:hover": { bgcolor: "#f0f0f0" },
          borderRadius: `${theme.borderRadius}px`,
        }}
      >
        {ctaLabel}
      </Button>
    </Box>
  );
}

// ─── Services Section ────────────────────────────────────────────────────────

type ServicesSectionProps = {
  config: TenantPublicSiteConfig;
  services: PublicServiceItem[];
  tenantSlug: string;
  theme: ResolvedTenantTheme;
};

export function ServicesSection({ config, services, tenantSlug, theme }: ServicesSectionProps) {
  if (services.length === 0) return null;

  const heading = config.services.heading || "Our Services";
  const featured = config.services.featuredServiceIds;

  // Sort: featured first, then by sort_order
  const sorted = [...services].sort((a, b) => {
    const aFeatured = featured.includes(a.id) ? 0 : 1;
    const bFeatured = featured.includes(b.id) ? 0 : 1;
    if (aFeatured !== bFeatured) return aFeatured - bFeatured;
    return a.sortOrder - b.sortOrder;
  });

  // Group by category if enabled
  const grouped = config.services.showCategories
    ? groupByCategory(sorted)
    : [{ category: null, items: sorted }];

  return (
    <Box component="section" aria-labelledby="services-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="services-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        {heading}
      </Typography>

      {grouped.map((group, gi) => (
        <Box key={gi} sx={{ mb: 3 }}>
          {group.category && (
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
              {group.category}
            </Typography>
          )}
          <Grid container spacing={1.5}>
            {group.items.map((service) => (
              <Grid key={service.id} size={{ xs: 12, sm: 6 }}>
                <Paper
                  component="a"
                  href={`/book/${tenantSlug}/services/${service.slug}`}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    borderRadius: `${theme.borderRadius}px`,
                    "&:hover": { borderColor: theme.primaryColor, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{service.name}</Typography>
                  {service.description && (
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {service.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{service.durationMinutes} min</Typography>
                    {Number(service.price) > 0 && (
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                        {service.price} {service.currency}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

function groupByCategory(services: PublicServiceItem[]) {
  const groups: Array<{ category: string | null; items: PublicServiceItem[] }> = [];
  const map = new Map<string | null, PublicServiceItem[]>();

  for (const s of services) {
    const key = s.categoryName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  for (const [category, items] of map) {
    groups.push({ category, items });
  }

  return groups;
}

// ─── About Section ───────────────────────────────────────────────────────────

type AboutProps = {
  config: TenantPublicSiteConfig;
};

export function AboutSection({ config }: AboutProps) {
  if (!config.about.body && !config.about.title) return null;

  return (
    <Box component="section" aria-labelledby="about-heading" sx={{ maxWidth: 700, mx: "auto", px: 2, py: 5 }}>
      {config.about.title && (
        <Typography id="about-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 2, textAlign: "center" }}>
          {config.about.title}
        </Typography>
      )}
      {config.about.body && (
        <Typography sx={{ fontSize: "0.9375rem", color: "text.secondary", whiteSpace: "pre-wrap", lineHeight: 1.7, textAlign: "center" }}>
          {config.about.body}
        </Typography>
      )}
    </Box>
  );
}

// ─── Staff Section ───────────────────────────────────────────────────────────

type StaffProps = {
  staff: PublicStaffItem[];
  tenantSlug: string;
  theme: ResolvedTenantTheme;
};

export function StaffSection({ staff, tenantSlug, theme }: StaffProps) {
  if (staff.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="staff-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="staff-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        Our Team
      </Typography>
      <Grid container spacing={2} justifyContent="center">
        {staff.map((member) => (
          <Grid key={member.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <Box sx={{ textAlign: "center" }}>
              {member.avatarUrl ? (
                <Box
                  component="img"
                  src={member.avatarUrl}
                  alt={member.displayName}
                  sx={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", mx: "auto", mb: 1 }}
                />
              ) : (
                <Box sx={{ width: 80, height: 80, borderRadius: "50%", bgcolor: theme.surfaceColor, mx: "auto", mb: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography sx={{ fontSize: "1.5rem", color: "text.secondary" }}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </Typography>
                </Box>
              )}
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{member.displayName}</Typography>
              {member.jobTitle && (
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{member.jobTitle}</Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── Gallery Section ─────────────────────────────────────────────────────────

type GalleryProps = {
  gallery: PublicGalleryItem[];
  supabaseUrl: string;
};

export function GallerySection({ gallery, supabaseUrl }: GalleryProps) {
  if (gallery.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="gallery-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="gallery-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        Gallery
      </Typography>
      <Grid container spacing={1}>
        {gallery.slice(0, 12).map((item) => (
          <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <Box
              component="img"
              src={`${supabaseUrl}/storage/v1/object/public/${item.path}`}
              alt={item.altText || "Gallery image"}
              loading="lazy"
              sx={{
                width: "100%",
                aspectRatio: "1",
                objectFit: "cover",
                borderRadius: 1,
                display: "block",
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── Reviews Section ─────────────────────────────────────────────────────────

type ReviewsProps = {
  reviews: PublicReviewData;
};

export function ReviewsSection({ reviews }: ReviewsProps) {
  if (reviews.reviews.length === 0 && !reviews.summary) return null;

  return (
    <Box component="section" aria-labelledby="reviews-heading" sx={{ maxWidth: 800, mx: "auto", px: 2, py: 5 }}>
      <Typography id="reviews-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 1, textAlign: "center" }}>
        Reviews
      </Typography>

      {reviews.summary && (
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <Rating value={reviews.summary.averageRating ?? 0} precision={0.1} readOnly size="medium" />
            <Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>
              {reviews.summary.averageRating}
            </Typography>
            <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              ({reviews.summary.count} review{reviews.summary.count !== 1 ? "s" : ""})
            </Typography>
          </Stack>
        </Box>
      )}

      <Stack spacing={2}>
        {reviews.reviews.slice(0, 6).map((review) => (
          <Paper key={review.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Rating value={review.rating} readOnly size="small" />
              {review.reviewerName && (
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                  {review.reviewerName}
                </Typography>
              )}
              {review.isFeatured && <Chip label="Featured" size="small" color="primary" variant="outlined" />}
            </Stack>
            {review.comment && (
              <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 1 }}>
                {review.comment}
              </Typography>
            )}
            {review.serviceName && (
              <Typography sx={{ fontSize: "0.75rem", color: "text.disabled" }}>
                Service: {review.serviceName}
              </Typography>
            )}
            {review.businessResponse && (
              <Box sx={{ mt: 1, pl: 2, borderLeft: "2px solid", borderColor: "divider" }}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>Business Response</Typography>
                <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                  {review.businessResponse}
                </Typography>
              </Box>
            )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Locations Section ───────────────────────────────────────────────────────

type LocationsProps = {
  locations: PublicLocationItem[];
  tenantSlug: string;
  theme: ResolvedTenantTheme;
};

export function LocationsSection({ locations, tenantSlug, theme }: LocationsProps) {
  if (locations.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="locations-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="locations-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        {locations.length === 1 ? "Our Location" : "Our Locations"}
      </Typography>
      <Grid container spacing={2}>
        {locations.map((loc) => (
          <Grid key={loc.id} size={{ xs: 12, sm: locations.length === 1 ? 12 : 6 }}>
            <Paper
              component="a"
              href={`/book/${tenantSlug}/locations/${loc.slug || loc.id}`}
              variant="outlined"
              sx={{ p: 2.5, display: "block", textDecoration: "none", color: "inherit", borderRadius: `${theme.borderRadius}px` }}
            >
              <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 0.5 }}>{loc.name}</Typography>
              {loc.streetAddress && (
                <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                  {[loc.streetAddress, loc.city, loc.provinceState].filter(Boolean).join(", ")}
                </Typography>
              )}
              {loc.phoneNumber && (
                <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mt: 0.5 }}>
                  {loc.phoneNumber}
                </Typography>
              )}
              {loc.description && (
                <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", mt: 1, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {loc.description}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────────────

type FaqProps = {
  faq: FaqEntry[];
};

export function FaqSection({ faq }: FaqProps) {
  if (faq.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="faq-heading" sx={{ maxWidth: 700, mx: "auto", px: 2, py: 5 }}>
      <Typography id="faq-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        Frequently Asked Questions
      </Typography>
      <Stack spacing={2}>
        {faq.map((entry, idx) => (
          <Box key={idx}>
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, mb: 0.5 }}>
              {entry.question}
            </Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", whiteSpace: "pre-wrap" }}>
              {entry.answer}
            </Typography>
            {idx < faq.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Gift Cards Section ──────────────────────────────────────────────────────

type GiftCardsProps = {
  tenantSlug: string;
  theme: ResolvedTenantTheme;
  enabled: boolean;
};

export function GiftCardsSection({ tenantSlug, theme, enabled }: GiftCardsProps) {
  if (!enabled) return null;

  return (
    <Box component="section" sx={{ textAlign: "center", py: 4, px: 2 }}>
      <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 1 }}>Gift Cards</Typography>
      <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 2 }}>
        Give the gift of wellness. Purchase a gift card for someone special.
      </Typography>
      <Button
        href={`/book/${tenantSlug}/gift-cards`}
        variant="outlined"
        sx={{ borderRadius: `${theme.borderRadius}px` }}
      >
        Buy a Gift Card
      </Button>
    </Box>
  );
}

// ─── Contact Section ─────────────────────────────────────────────────────────

type ContactProps = {
  tenant: PublicTenantInfo;
  locations: PublicLocationItem[];
  socialLinks: SocialLink[];
};

export function ContactSection({ tenant, locations, socialLinks }: ContactProps) {
  const primaryLocation = locations.find(l => l.isPrimary) ?? locations[0];

  return (
    <Box component="section" aria-labelledby="contact-heading" sx={{ maxWidth: 700, mx: "auto", px: 2, py: 5, textAlign: "center" }}>
      <Typography id="contact-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 2 }}>
        Contact Us
      </Typography>

      {primaryLocation && (
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {primaryLocation.streetAddress && (
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
              {[primaryLocation.streetAddress, primaryLocation.city, primaryLocation.provinceState, primaryLocation.postalCode].filter(Boolean).join(", ")}
            </Typography>
          )}
          {primaryLocation.phoneNumber && (
            <Typography sx={{ fontSize: "0.875rem" }}>
              <a href={`tel:${primaryLocation.phoneNumber}`} style={{ color: "inherit", textDecoration: "none" }}>
                {primaryLocation.phoneNumber}
              </a>
            </Typography>
          )}
          {primaryLocation.email && (
            <Typography sx={{ fontSize: "0.875rem" }}>
              <a href={`mailto:${primaryLocation.email}`} style={{ color: "inherit", textDecoration: "none" }}>
                {primaryLocation.email}
              </a>
            </Typography>
          )}
        </Stack>
      )}

      {socialLinks.length > 0 && (
        <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
          {socialLinks.map((link) => (
            <Chip
              key={link.platform}
              component="a"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              label={link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
              size="small"
              variant="outlined"
              clickable
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ─── Public Site Navigation ──────────────────────────────────────────────────

type NavProps = {
  tenant: PublicTenantInfo;
  sections: Array<{ type: string; enabled: boolean }>;
  theme: ResolvedTenantTheme;
  tenantSlug: string;
  bookingEnabled: boolean;
};

export function PublicSiteNav({ tenant, sections, theme, tenantSlug, bookingEnabled }: NavProps) {
  const enabledSections = sections.filter(s => s.enabled);

  const sectionAnchors: Record<string, string> = {
    services: "#services-heading",
    about: "#about-heading",
    staff: "#staff-heading",
    gallery: "#gallery-heading",
    reviews: "#reviews-heading",
    locations: "#locations-heading",
    faq: "#faq-heading",
    contact: "#contact-heading",
  };

  const navItems = enabledSections
    .filter(s => sectionAnchors[s.type])
    .map(s => ({ label: SECTION_LABELS[s.type as keyof typeof SECTION_LABELS] ?? s.type, href: sectionAnchors[s.type]! }));

  return (
    <Box
      component="nav"
      aria-label="Site navigation"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "sticky",
        top: 0,
        zIndex: 10,
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700 }}>
        {tenant.name}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ display: { xs: "none", md: "flex" } }}>
        {navItems.slice(0, 5).map(item => (
          <Button key={item.href} href={item.href} size="small" sx={{ fontSize: "0.8125rem", textTransform: "none" }}>
            {item.label}
          </Button>
        ))}
      </Stack>

      {bookingEnabled && (
        <Button
          href={`/book/${tenantSlug}#booking`}
          variant="contained"
          size="small"
          sx={{ borderRadius: `${theme.borderRadius}px`, fontWeight: 600 }}
        >
          Book
        </Button>
      )}
    </Box>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

type FooterProps = {
  tenant: PublicTenantInfo;
};

export function PublicSiteFooter({ tenant }: FooterProps) {
  return (
    <Box sx={{ textAlign: "center", py: 3, borderTop: "1px solid", borderColor: "divider" }}>
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
        &copy; {new Date().getFullYear()} {tenant.name}
      </Typography>
      <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled", mt: 0.5 }}>
        Powered by get-slot.app
      </Typography>
    </Box>
  );
}

const SECTION_LABELS: Record<string, string> = {
  services: "Services",
  about: "About",
  staff: "Team",
  gallery: "Gallery",
  reviews: "Reviews",
  locations: "Locations",
  gift_cards: "Gift Cards",
  faq: "FAQ",
  contact: "Contact",
};
