/**
 * Branding Config Validation — Milestone 14.4.
 *
 * Server-side validation for tenant branding configuration.
 * Rejects unsafe values. Normalizes colors.
 */

import {
  type TenantBrandingConfig,
  FONT_PRESETS,
  RADIUS_PRESETS,
  APPEARANCE_MODES,
  HERO_LAYOUTS,
  DEFAULT_BRANDING_CONFIG,
} from "../types/branding-config";
import { normalizeHexColor, isValidHexColor } from "./color-utils";

export type ValidationResult =
  | { valid: true; config: TenantBrandingConfig }
  | { valid: false; errors: string[] };

/**
 * Validates and normalizes a branding config object from client input.
 * Returns a clean TenantBrandingConfig or validation errors.
 */
export function validateBrandingConfig(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Invalid configuration format."] };
  }

  const raw = input as Record<string, unknown>;
  const errors: string[] = [];

  // Colors
  const primaryColor = normalizeHexColor(String(raw.primaryColor ?? ""));
  const accentColor = normalizeHexColor(String(raw.accentColor ?? ""));
  const backgroundColor = normalizeHexColor(String(raw.backgroundColor ?? ""));
  const surfaceColor = normalizeHexColor(String(raw.surfaceColor ?? ""));

  if (!primaryColor) errors.push("Primary color must be a valid hex color (#RRGGBB).");
  if (!accentColor) errors.push("Accent color must be a valid hex color (#RRGGBB).");
  if (!backgroundColor) errors.push("Background color must be a valid hex color (#RRGGBB).");
  if (!surfaceColor) errors.push("Surface color must be a valid hex color (#RRGGBB).");

  // Appearance
  const appearance = String(raw.appearance ?? "light");
  if (!APPEARANCE_MODES.includes(appearance as typeof APPEARANCE_MODES[number])) {
    errors.push("Appearance must be 'light' or 'dark'.");
  }

  // Font
  const fontPreset = String(raw.fontPreset ?? "modern");
  if (!FONT_PRESETS.includes(fontPreset as typeof FONT_PRESETS[number])) {
    errors.push("Font preset is invalid.");
  }

  // Radius
  const radiusPreset = String(raw.radiusPreset ?? "soft");
  if (!RADIUS_PRESETS.includes(radiusPreset as typeof RADIUS_PRESETS[number])) {
    errors.push("Radius preset is invalid.");
  }

  // Hero
  const heroLayout = String(raw.heroLayout ?? "minimal");
  if (!HERO_LAYOUTS.includes(heroLayout as typeof HERO_LAYOUTS[number])) {
    errors.push("Hero layout is invalid.");
  }

  // Media IDs (UUIDs or null)
  const logoMediaId = typeof raw.logoMediaId === "string" && raw.logoMediaId.length > 0 ? raw.logoMediaId : null;
  const coverMediaId = typeof raw.coverMediaId === "string" && raw.coverMediaId.length > 0 ? raw.coverMediaId : null;

  // Tagline (plain text, max 200 chars)
  let tagline: string | null = null;
  if (typeof raw.tagline === "string" && raw.tagline.trim().length > 0) {
    tagline = raw.tagline.trim().slice(0, 200);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    config: {
      schemaVersion: 1,
      primaryColor: primaryColor!,
      accentColor: accentColor!,
      backgroundColor: backgroundColor!,
      surfaceColor: surfaceColor!,
      appearance: appearance as TenantBrandingConfig["appearance"],
      fontPreset: fontPreset as TenantBrandingConfig["fontPreset"],
      radiusPreset: radiusPreset as TenantBrandingConfig["radiusPreset"],
      heroLayout: heroLayout as TenantBrandingConfig["heroLayout"],
      logoMediaId,
      coverMediaId,
      tagline,
    },
  };
}

/**
 * Resolves a raw JSONB config from DB into a valid TenantBrandingConfig.
 * Falls back to defaults for missing/invalid fields.
 */
export function resolveBrandingConfig(raw: unknown): TenantBrandingConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_BRANDING_CONFIG;

  const obj = raw as Record<string, unknown>;

  return {
    schemaVersion: 1,
    primaryColor: isValidHexColor(String(obj.primaryColor ?? ""))
      ? normalizeHexColor(String(obj.primaryColor))!
      : DEFAULT_BRANDING_CONFIG.primaryColor,
    accentColor: isValidHexColor(String(obj.accentColor ?? ""))
      ? normalizeHexColor(String(obj.accentColor))!
      : DEFAULT_BRANDING_CONFIG.accentColor,
    backgroundColor: isValidHexColor(String(obj.backgroundColor ?? ""))
      ? normalizeHexColor(String(obj.backgroundColor))!
      : DEFAULT_BRANDING_CONFIG.backgroundColor,
    surfaceColor: isValidHexColor(String(obj.surfaceColor ?? ""))
      ? normalizeHexColor(String(obj.surfaceColor))!
      : DEFAULT_BRANDING_CONFIG.surfaceColor,
    appearance: APPEARANCE_MODES.includes(String(obj.appearance ?? "") as typeof APPEARANCE_MODES[number])
      ? (String(obj.appearance) as TenantBrandingConfig["appearance"])
      : DEFAULT_BRANDING_CONFIG.appearance,
    fontPreset: FONT_PRESETS.includes(String(obj.fontPreset ?? "") as typeof FONT_PRESETS[number])
      ? (String(obj.fontPreset) as TenantBrandingConfig["fontPreset"])
      : DEFAULT_BRANDING_CONFIG.fontPreset,
    radiusPreset: RADIUS_PRESETS.includes(String(obj.radiusPreset ?? "") as typeof RADIUS_PRESETS[number])
      ? (String(obj.radiusPreset) as TenantBrandingConfig["radiusPreset"])
      : DEFAULT_BRANDING_CONFIG.radiusPreset,
    heroLayout: HERO_LAYOUTS.includes(String(obj.heroLayout ?? "") as typeof HERO_LAYOUTS[number])
      ? (String(obj.heroLayout) as TenantBrandingConfig["heroLayout"])
      : DEFAULT_BRANDING_CONFIG.heroLayout,
    logoMediaId: typeof obj.logoMediaId === "string" ? obj.logoMediaId : null,
    coverMediaId: typeof obj.coverMediaId === "string" ? obj.coverMediaId : null,
    tagline: typeof obj.tagline === "string" ? obj.tagline.slice(0, 200) : null,
  };
}
