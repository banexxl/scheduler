/**
 * Public Site Configuration Types — Milestone 15.13.
 *
 * Strongly typed structured site configuration for tenant public websites.
 * Stored as JSONB in tenant_public_site_settings (draft + published).
 *
 * Key principles:
 * - No arbitrary HTML/JS/CSS
 * - All content is plain structured text
 * - Section types controlled by server-side registry
 * - Referenced IDs (services, media) validated at publish time
 * - Bounded text lengths
 */

// ─── Section Types ───────────────────────────────────────────────────────────

/**
 * Allowlisted section types. Browser cannot create arbitrary types.
 */
export const SITE_SECTION_TYPES = [
  "hero",
  "services",
  "about",
  "staff",
  "gallery",
  "reviews",
  "locations",
  "gift_cards",
  "faq",
  "contact",
] as const;

export type SiteSectionType = (typeof SITE_SECTION_TYPES)[number];

// ─── Section Config ──────────────────────────────────────────────────────────

export type SiteSection = {
  type: SiteSectionType;
  enabled: boolean;
};

// ─── Hero Config ─────────────────────────────────────────────────────────────

export type HeroConfig = {
  enabled: boolean;
  headline: string | null;
  subheadline: string | null;
  primaryCtaLabel: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
};

// ─── About Config ────────────────────────────────────────────────────────────

export type AboutConfig = {
  title: string | null;
  body: string | null;
  mediaAssetId: string | null;
};

// ─── Services Section Config ─────────────────────────────────────────────────

export type ServicesSectionConfig = {
  heading: string | null;
  featuredServiceIds: string[];
  showCategories: boolean;
  displayMode: "grid" | "list";
};

// ─── FAQ Entry ───────────────────────────────────────────────────────────────

export type FaqEntry = {
  question: string;
  answer: string;
};

// ─── Contact / Social Links ──────────────────────────────────────────────────

export const ALLOWED_SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "website",
] as const;

export type SocialPlatform = (typeof ALLOWED_SOCIAL_PLATFORMS)[number];

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

// ─── Full Site Config ────────────────────────────────────────────────────────

export type TenantPublicSiteConfig = {
  schemaVersion: 1;

  /** Hero section */
  hero: HeroConfig;

  /** Ordered sections displayed on the homepage */
  sections: SiteSection[];

  /** About section content */
  about: AboutConfig;

  /** Services section config */
  services: ServicesSectionConfig;

  /** FAQ entries (max 50) */
  faq: FaqEntry[];

  /** Social/contact links */
  socialLinks: SocialLink[];

  /** SEO overrides */
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
  };
};

// ─── Default Config ──────────────────────────────────────────────────────────

export const DEFAULT_SITE_CONFIG: TenantPublicSiteConfig = {
  schemaVersion: 1,
  hero: {
    enabled: true,
    headline: null,
    subheadline: null,
    primaryCtaLabel: "Book Now",
    secondaryCtaLabel: null,
    secondaryCtaUrl: null,
  },
  sections: [
    { type: "services", enabled: true },
    { type: "about", enabled: false },
    { type: "staff", enabled: false },
    { type: "gallery", enabled: false },
    { type: "reviews", enabled: true },
    { type: "locations", enabled: true },
    { type: "gift_cards", enabled: false },
    { type: "faq", enabled: false },
    { type: "contact", enabled: true },
  ],
  about: {
    title: null,
    body: null,
    mediaAssetId: null,
  },
  services: {
    heading: null,
    featuredServiceIds: [],
    showCategories: true,
    displayMode: "grid",
  },
  faq: [],
  socialLinks: [],
  seo: {
    metaTitle: null,
    metaDescription: null,
  },
};

// ─── Limits ──────────────────────────────────────────────────────────────────

export const SITE_CONFIG_LIMITS = {
  heroHeadline: 120,
  heroSubheadline: 250,
  heroCtaLabel: 40,
  aboutTitle: 120,
  aboutBody: 3000,
  faqQuestion: 300,
  faqAnswer: 2000,
  faqMaxEntries: 50,
  socialUrlMax: 500,
  seoMetaTitle: 70,
  seoMetaDescription: 160,
  maxSections: 12,
  featuredServicesMax: 12,
} as const;

// ─── Public Site DTO (for rendering) ─────────────────────────────────────────

/**
 * Resolved public site data passed to rendering components.
 * Contains only public-safe, serializable values.
 */
export type PublicSiteData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    timeZone: string;
  };
  config: TenantPublicSiteConfig;
  socialLinks: SocialLink[];
};
