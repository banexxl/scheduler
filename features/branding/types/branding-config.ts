/**
 * Tenant Branding Config Types — Milestone 14.4.
 *
 * Strongly typed theme configuration for tenant public surfaces.
 */

// ─── Presets ─────────────────────────────────────────────────────────────────

export const FONT_PRESETS = ["modern", "clean", "friendly", "elegant", "classic"] as const;
export type FontPreset = typeof FONT_PRESETS[number];

export const RADIUS_PRESETS = ["square", "soft", "rounded"] as const;
export type RadiusPreset = typeof RADIUS_PRESETS[number];

export const APPEARANCE_MODES = ["light", "dark"] as const;
export type AppearanceMode = typeof APPEARANCE_MODES[number];

export const HERO_LAYOUTS = ["minimal", "image", "centered"] as const;
export type HeroLayout = typeof HERO_LAYOUTS[number];

// ─── Branding Config ─────────────────────────────────────────────────────────

export type TenantBrandingConfig = {
  schemaVersion: 1;

  // Colors (hex format: #RRGGBB)
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;

  // Appearance
  appearance: AppearanceMode;

  // Typography
  fontPreset: FontPreset;

  // Shape
  radiusPreset: RadiusPreset;

  // Layout
  heroLayout: HeroLayout;

  // Identity (references to media_assets IDs or null)
  logoMediaId: string | null;
  coverMediaId: string | null;

  // Text
  tagline: string | null;
};

// ─── Default Config ──────────────────────────────────────────────────────────

export const DEFAULT_BRANDING_CONFIG: TenantBrandingConfig = {
  schemaVersion: 1,
  primaryColor: "#2563eb",
  accentColor: "#f59e0b",
  backgroundColor: "#ffffff",
  surfaceColor: "#f9fafb",
  appearance: "light",
  fontPreset: "modern",
  radiusPreset: "soft",
  heroLayout: "minimal",
  logoMediaId: null,
  coverMediaId: null,
  tagline: null,
};

// ─── Resolved Theme ──────────────────────────────────────────────────────────

/**
 * Sanitized DTO passed to public rendering.
 * Contains only render-safe values. No DB internals.
 */
export type ResolvedTenantTheme = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  appearance: AppearanceMode;
  fontFamily: string;
  borderRadius: number;
  heroLayout: HeroLayout;
  logoUrl: string | null;
  coverUrl: string | null;
  tagline: string | null;
};

// ─── Font Preset Mapping ─────────────────────────────────────────────────────

export const FONT_FAMILY_MAP: Record<FontPreset, string> = {
  modern: '"Inter", "Helvetica Neue", Arial, sans-serif',
  clean: '"Roboto", "Helvetica", Arial, sans-serif',
  friendly: '"Nunito", "Segoe UI", sans-serif',
  elegant: '"Playfair Display", Georgia, serif',
  classic: 'Georgia, "Times New Roman", serif',
};

// ─── Radius Preset Mapping ───────────────────────────────────────────────────

export const RADIUS_MAP: Record<RadiusPreset, number> = {
  square: 4,
  soft: 10,
  rounded: 18,
};
