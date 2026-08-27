/**
 * Dynamic Theme Engine Types — Milestone 16.1.
 *
 * Extends the existing branding type system with:
 * - Google Font enum for next/font integration
 * - Tenant context shape for the theme provider
 * - Re-exports from the canonical branding-config types
 */

import type { Theme } from "@mui/material/styles";
import type {
  ResolvedTenantTheme,
  TenantBrandingConfig,
  AppearanceMode,
  HeroLayout,
} from "@/features/branding/types/branding-config";
import type { TemplateId } from "@/features/templates/types";

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type {
  ResolvedTenantTheme,
  TenantBrandingConfig,
  AppearanceMode,
  HeroLayout,
};
export type { TemplateId };

// ─── Google Font Enum ────────────────────────────────────────────────────────

/**
 * Supported Google Fonts for tenant branding.
 * Values match the font family names used in CSS / MUI typography.
 */
export const SUPPORTED_FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Lora",
  "Roboto",
  "Open Sans",
] as const;

export type SupportedFont = (typeof SUPPORTED_FONTS)[number];

// ─── Font CSS Variable ──────────────────────────────────────────────────────

/** CSS custom property injected by the font loader for MUI consumption. */
export const TENANT_FONT_CSS_VAR = "--tenant-font-family";

// ─── Tenant Branding DTO ─────────────────────────────────────────────────────

/**
 * Branding payload passed from the server layout to the client provider.
 * Contains resolved theme + tenant metadata needed for rendering.
 */
export type TenantBranding = {
  /** Resolved render-safe theme from tenant_branding_settings. */
  theme: ResolvedTenantTheme;
  /** Tenant metadata. */
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  /** Matched Google Font name, or null if the font isn't in the supported set. */
  fontName: SupportedFont | null;
  /** Active template ID for the booking portal. */
  templateId: TemplateId;
};

// ─── Theme Context ───────────────────────────────────────────────────────────

/**
 * Shape exposed by TenantThemeProvider context.
 * US-16.1.4: branding, muiTheme, tenant, and template are all accessible.
 */
export type TenantThemeContextValue = {
  /** Resolved branding (colors, font, radius, layout, etc.) */
  branding: ResolvedTenantTheme;
  /** Generated MUI theme derived from branding. */
  muiTheme: Theme;
  /** Tenant metadata. */
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  /** Active template for the booking portal — Milestone 16.2. */
  template: TemplateId;
};
