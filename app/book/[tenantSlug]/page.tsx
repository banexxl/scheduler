import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Rating from "@mui/material/Rating";
import Chip from "@mui/material/Chip";
import { resolvePublicBookingContext } from "@/features/public-booking/services/public-tenant-resolver";
import { getPublicBookableServices } from "@/features/public-booking/services/public-service-discovery";
import { resolvePublicSite } from "@/features/public-site/services/public-site-resolver";
import { getPublicHomepageData } from "@/features/homepage-builder/actions/homepage-actions";
import PublicBookingFlow from "@/features/public-booking/components/public-booking-flow";
import JsonLdScript from "@/features/public-site/components/json-ld-script";
import { buildLocalBusinessJsonLd, buildFaqJsonLd } from "@/features/public-site/utils/structured-data";
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
  return { title, description, openGraph: { title, description, type: "website" } };
}

/* ─── Glass Card wrapper ──────────────────────────────────────────────────── */

function GlassSection({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <Box
      id={id}
      sx={{
        bgcolor: "rgba(22, 22, 30, 0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 3,
        p: { xs: 3, sm: 4 },
        backdropFilter: "blur(8px)",
        mb: 3,
      }}
    >
      {children}
    </Box>
  );
}

function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <Typography
      id={id}
      component="h2"
      sx={{
        fontSize: { xs: "1.25rem", md: "1.5rem" },
        fontWeight: 700,
        mb: 3,
        textAlign: "center",
        color: "#f0f0f5",
      }}
    >
      {children}
    </Typography>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const bookingContext = await resolvePublicBookingContext(tenantSlug);
  if (!bookingContext) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 3, minHeight: "40vh" }}>
        <GlassSection>
          <Typography variant="h6" gutterBottom sx={{ color: "#f0f0f5" }}>Online Booking Unavailable</Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e" }}>
            Online booking is currently unavailable for this business. Please contact them directly.
          </Typography>
        </GlassSection>
      </Box>
    );
  }

  const { tenant: bookingTenant, settings } = bookingContext;
  const siteResult = await resolvePublicSite(tenantSlug);
  const homepageData = await getPublicHomepageData(bookingTenant.id);

  let bookableServices: Awaited<ReturnType<typeof getPublicBookableServices>>;
  try {
    bookableServices = await getPublicBookableServices(bookingTenant.id);
  } catch {
    bookableServices = [];
  }

  const site = siteResult.data;
  const { content, gallery, testimonials } = homepageData;
  const { sectionOrder, sectionVisibility } = content;

  const services = site?.services ?? [];
  const staff = site?.staff ?? [];
  const locations = site?.locations ?? [];
  const reviews = site?.reviews ?? { reviews: [], summary: null };
  const features = site?.features ?? { publicBookingEnabled: true, giftCardsEnabled: false, onlinePaymentsEnabled: false };
  const config = site?.config;
  const tenant = site?.tenant;

  /* ─── Section Renderers (dark glass themed) ──────────────────────────── */

  const sectionRenderers: Record<HomepageSectionId, (() => React.ReactNode) | null> = {
    hero: null, // Rendered by template shell
    cta: null,  // Rendered by template shell

    about: () => {
      if (!content.aboutBody && !content.aboutTitle) return null;
      return (
        <GlassSection id="about">
          {content.aboutTitle && <SectionHeading>{content.aboutTitle}</SectionHeading>}
          {content.aboutBody && (
            <Typography sx={{ fontSize: "0.9375rem", color: "#8b8b9e", whiteSpace: "pre-wrap", lineHeight: 1.8, textAlign: "center", maxWidth: 600, mx: "auto" }}>
              {content.aboutBody}
            </Typography>
          )}
        </GlassSection>
      );
    },

    services: () => {
      if (services.length === 0) return null;
      const preview = services.slice(0, 9);
      return (
        <GlassSection id="services">
          <SectionHeading>Our Services</SectionHeading>
          <Grid container spacing={2}>
            {preview.map((service) => (
              <Grid key={service.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  sx={{
                    p: 2.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    transition: "border-color 0.3s, transform 0.3s",
                    "&:hover": { borderColor: "rgba(124,58,237,0.3)", transform: "translateY(-2px)" },
                  }}
                  elevation={0}
                >
                  <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, color: "#f0f0f5", mb: 0.5 }}>
                    {service.name}
                  </Typography>
                  {service.description && (
                    <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e", mb: 1, flexGrow: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {service.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>{service.durationMinutes} min</Typography>
                    {Number(service.price) > 0 && (
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#a78bfa" }}>
                        {service.currency} {service.price}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </GlassSection>
      );
    },

    staff: () => {
      if (staff.length === 0) return null;
      const preview = staff.slice(0, 8);
      return (
        <GlassSection id="staff">
          <SectionHeading>Our Team</SectionHeading>
          <Grid container spacing={2} justifyContent="center">
            {preview.map((member) => (
              <Grid key={member.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <Box sx={{ textAlign: "center" }}>
                  {member.avatarUrl ? (
                    <Avatar
                      src={member.avatarUrl}
                      alt={member.displayName}
                      sx={{ width: 80, height: 80, mx: "auto", mb: 1, border: "2px solid rgba(255,255,255,0.08)" }}
                    />
                  ) : (
                    <Avatar sx={{ width: 80, height: 80, mx: "auto", mb: 1, bgcolor: "rgba(124,58,237,0.15)", color: "#a78bfa", fontSize: "1.5rem", fontWeight: 700 }}>
                      {member.displayName.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#f0f0f5" }}>{member.displayName}</Typography>
                  {member.jobTitle && (
                    <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>{member.jobTitle}</Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </GlassSection>
      );
    },

    gallery: () => {
      if (gallery.length === 0) return null;
      return (
        <GlassSection id="gallery">
          <SectionHeading>Gallery</SectionHeading>
          <Grid container spacing={1}>
            {gallery.slice(0, 8).map((img) => (
              <Grid key={img.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <Box
                  component="img"
                  src={img.imageUrl}
                  alt={img.altText || "Gallery image"}
                  loading="lazy"
                  sx={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 1.5,
                    display: "block",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </GlassSection>
      );
    },

    testimonials: () => {
      if (testimonials.length === 0) return null;
      return (
        <GlassSection id="testimonials">
          <SectionHeading>What Our Clients Say</SectionHeading>
          <Grid container spacing={2}>
            {testimonials.slice(0, 6).map((t) => (
              <Grid key={t.id} size={{ xs: 12, sm: 6 }}>
                <Paper
                  sx={{
                    p: 2.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 2,
                  }}
                  elevation={0}
                >
                  <Rating value={t.rating} readOnly size="small" sx={{ mb: 1 }} />
                  <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", fontStyle: "italic", mb: 1.5, lineHeight: 1.6 }}>
                    &ldquo;{t.body}&rdquo;
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#f0f0f5" }}>
                    — {t.authorName}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </GlassSection>
      );
    },
  };

  return (
    <>
      {/* Homepage builder sections */}
      {sectionOrder
        .filter((id) => sectionVisibility[id])
        .map((id) => {
          const renderer = sectionRenderers[id];
          if (!renderer) return null;
          return <Box key={id}>{renderer()}</Box>;
        })}

      {/* Reviews (legacy config) */}
      {reviews.reviews.length > 0 && (
        <GlassSection id="reviews">
          <SectionHeading>Reviews</SectionHeading>
          {reviews.summary && (
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
              <Rating value={reviews.summary.averageRating ?? 0} precision={0.1} readOnly />
              <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#f0f0f5" }}>{reviews.summary.averageRating}</Typography>
              <Typography sx={{ fontSize: "0.8125rem", color: "#5c5c72" }}>
                ({reviews.summary.count} review{reviews.summary.count !== 1 ? "s" : ""})
              </Typography>
            </Stack>
          )}
          <Stack spacing={2}>
            {reviews.reviews.slice(0, 6).map((review) => (
              <Paper key={review.id} sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2 }} elevation={0}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Rating value={review.rating} readOnly size="small" />
                  {review.reviewerName && <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#f0f0f5" }}>{review.reviewerName}</Typography>}
                  {review.isFeatured && <Chip label="Featured" size="small" sx={{ bgcolor: "rgba(124,58,237,0.15)", color: "#a78bfa", fontSize: "0.6875rem" }} />}
                </Stack>
                {review.comment && <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", mb: 1 }}>{review.comment}</Typography>}
                {review.businessResponse && (
                  <Box sx={{ mt: 1, pl: 2, borderLeft: "2px solid rgba(255,255,255,0.08)" }}>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#8b8b9e" }}>Business Response</Typography>
                    <Typography sx={{ fontSize: "0.8125rem", color: "#5c5c72" }}>{review.businessResponse}</Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        </GlassSection>
      )}

      {/* Locations */}
      {locations.length > 0 && (
        <GlassSection id="locations">
          <SectionHeading>{locations.length === 1 ? "Our Location" : "Our Locations"}</SectionHeading>
          <Grid container spacing={2}>
            {locations.map((loc) => (
              <Grid key={loc.id} size={{ xs: 12, sm: locations.length === 1 ? 12 : 6 }}>
                <Paper sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2 }} elevation={0}>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 0.5, color: "#f0f0f5" }}>{loc.name}</Typography>
                  {loc.streetAddress && (
                    <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>
                      {[loc.streetAddress, loc.city, loc.provinceState].filter(Boolean).join(", ")}
                    </Typography>
                  )}
                  {loc.phoneNumber && <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e", mt: 0.5 }}>{loc.phoneNumber}</Typography>}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </GlassSection>
      )}

      {/* FAQ */}
      {config && config.faq.length > 0 && (
        <GlassSection id="faq">
          <SectionHeading>Frequently Asked Questions</SectionHeading>
          <Stack spacing={2} sx={{ maxWidth: 600, mx: "auto" }}>
            {config.faq.map((entry, idx) => (
              <Box key={idx}>
                <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, mb: 0.5, color: "#f0f0f5" }}>{entry.question}</Typography>
                <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{entry.answer}</Typography>
                {idx < config.faq.length - 1 && <Divider sx={{ mt: 2, borderColor: "rgba(255,255,255,0.06)" }} />}
              </Box>
            ))}
          </Stack>
        </GlassSection>
      )}

      {/* Gift Cards */}
      {features.giftCardsEnabled && (
        <GlassSection>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, mb: 1, color: "#f0f0f5" }}>Gift Cards</Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", mb: 2 }}>
              Give the gift of wellness. Purchase a gift card for someone special.
            </Typography>
            <Button
              href={`/book/${tenantSlug}/gift-cards`}
              variant="outlined"
              sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.12)", color: "#a0a0b8", "&:hover": { borderColor: "rgba(124,58,237,0.4)", color: "#f0f0f5" } }}
            >
              Buy a Gift Card
            </Button>
          </Box>
        </GlassSection>
      )}

      {/* Contact */}
      {tenant && (
        <GlassSection id="contact">
          <SectionHeading>Contact Us</SectionHeading>
          {locations.length > 0 && (() => {
            const primary = locations.find(l => l.isPrimary) ?? locations[0];
            if (!primary) return null;
            return (
              <Stack spacing={0.5} sx={{ textAlign: "center", mb: 2 }}>
                {primary.streetAddress && (
                  <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e" }}>
                    {[primary.streetAddress, primary.city, primary.provinceState, primary.postalCode].filter(Boolean).join(", ")}
                  </Typography>
                )}
                {primary.phoneNumber && (
                  <Typography component="a" href={`tel:${primary.phoneNumber}`} sx={{ fontSize: "0.875rem", color: "#8b8b9e", textDecoration: "none", "&:hover": { color: "#a78bfa" } }}>
                    {primary.phoneNumber}
                  </Typography>
                )}
                {primary.email && (
                  <Typography component="a" href={`mailto:${primary.email}`} sx={{ fontSize: "0.875rem", color: "#8b8b9e", textDecoration: "none", "&:hover": { color: "#a78bfa" } }}>
                    {primary.email}
                  </Typography>
                )}
              </Stack>
            );
          })()}
          {tenant.socialLinks && tenant.socialLinks.length > 0 && (
            <Stack direction="row" spacing={1} justifyContent="center">
              {tenant.socialLinks.map((link) => (
                <Chip
                  key={link.platform}
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  label={link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                  size="small"
                  clickable
                  sx={{ bgcolor: "rgba(255,255,255,0.05)", color: "#8b8b9e", border: "1px solid rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(124,58,237,0.1)", color: "#a78bfa" } }}
                />
              ))}
            </Stack>
          )}
        </GlassSection>
      )}

      {/* ═══ Booking Wizard ═══ */}
      {features.publicBookingEnabled && bookableServices.length > 0 && (
        <Box id="booking" sx={{ maxWidth: 600, mx: "auto", py: 5 }}>
          <Typography component="h2" sx={{ fontSize: "1.5rem", fontWeight: 700, mb: 3, textAlign: "center", color: "#f0f0f5" }}>
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

      {/* JSON-LD */}
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
