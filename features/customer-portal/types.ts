/**
 * Customer Portal Types — Milestone 16.3.
 *
 * Data types for the portal shell components (Header, Hero, Footer, CTA).
 * Portal data is loaded server-side and made available via context.
 */

// ─── Portal Data ─────────────────────────────────────────────────────────────

/**
 * Tenant business info needed by portal shell components.
 * Loaded alongside branding in the booking layout.
 */
export type PortalData = {
  /** Business description / tagline for hero. */
  description: string | null;
  /** Primary contact email. */
  contactEmail: string | null;
  /** Primary contact phone. */
  contactPhone: string | null;
  /** Business website URL. */
  websiteUrl: string | null;
  /** Social links as platform → URL map. */
  socialLinks: Record<string, string>;
  /** Primary location address (if available). */
  address: PortalAddress | null;
  /** Hero configuration from published site config. */
  hero: PortalHeroConfig;
};

/**
 * Simplified address from the primary location.
 */
export type PortalAddress = {
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

/**
 * Hero section configuration resolved from published site config.
 */
export type PortalHeroConfig = {
  headline: string | null;
  subheadline: string | null;
  ctaLabel: string;
};

// ─── Navigation ──────────────────────────────────────────────────────────────

export type PortalNavItem = {
  label: string;
  href: string;
  /** Whether this nav item matches the current route. */
  active: boolean;
};
