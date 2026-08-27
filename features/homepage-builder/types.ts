/**
 * Homepage Content Builder Types — Milestone 16.4.
 *
 * Types for homepage content editing and public rendering.
 */

// ─── Section IDs ─────────────────────────────────────────────────────────────

export const HOMEPAGE_SECTION_IDS = [
  "hero",
  "about",
  "services",
  "staff",
  "gallery",
  "testimonials",
  "cta",
] as const;

export type HomepageSectionId = (typeof HOMEPAGE_SECTION_IDS)[number];

export const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionId, string> = {
  hero: "Hero",
  about: "About",
  services: "Services Preview",
  staff: "Staff Preview",
  gallery: "Gallery",
  testimonials: "Testimonials",
  cta: "Call to Action",
};

// ─── CTA Targets ─────────────────────────────────────────────────────────────

export const CTA_TARGETS = ["services", "staff", "locations", "booking"] as const;
export type CtaTarget = (typeof CTA_TARGETS)[number];

export const CTA_TARGET_LABELS: Record<CtaTarget, string> = {
  services: "Services",
  staff: "Staff",
  locations: "Locations",
  booking: "Booking Widget",
};

// ─── Homepage Content ────────────────────────────────────────────────────────

export type HomepageContent = {
  // Hero
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroCtaLabel: string;
  heroCtaTarget: CtaTarget;

  // About
  aboutTitle: string | null;
  aboutBody: string | null;
  aboutImageUrl: string | null;

  // Section config
  sectionOrder: HomepageSectionId[];
  sectionVisibility: Record<HomepageSectionId, boolean>;
};

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  heroTitle: null,
  heroSubtitle: null,
  heroCtaLabel: "Book Now",
  heroCtaTarget: "services",
  aboutTitle: null,
  aboutBody: null,
  aboutImageUrl: null,
  sectionOrder: ["hero", "about", "services", "staff", "gallery", "testimonials", "cta"],
  sectionVisibility: {
    hero: true,
    about: false,
    services: true,
    staff: true,
    gallery: false,
    testimonials: false,
    cta: true,
  },
};

// ─── Gallery Image ───────────────────────────────────────────────────────────

export type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
};

// ─── Testimonial ─────────────────────────────────────────────────────────────

export type Testimonial = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  avatarUrl: string | null;
  sortOrder: number;
};

// ─── Form Values ─────────────────────────────────────────────────────────────

export type HeroFormValues = {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaTarget: CtaTarget;
};

export type AboutFormValues = {
  aboutTitle: string;
  aboutBody: string;
  aboutImageUrl: string;
};

export type TestimonialFormValues = {
  authorName: string;
  rating: number;
  body: string;
  avatarUrl: string;
};

// ─── Full Homepage Data (for public rendering) ───────────────────────────────

export type HomepageData = {
  content: HomepageContent;
  gallery: GalleryImage[];
  testimonials: Testimonial[];
};

// ─── Limits ──────────────────────────────────────────────────────────────────

export const HOMEPAGE_LIMITS = {
  heroTitle: 120,
  heroSubtitle: 250,
  heroCtaLabel: 40,
  aboutTitle: 120,
  aboutBody: 3000,
  testimonialAuthor: 100,
  testimonialBody: 2000,
  galleryAltText: 250,
  galleryCaption: 500,
  maxGalleryImages: 12,
  maxTestimonials: 20,
} as const;
