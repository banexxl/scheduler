/**
 * Google Font Loader — Milestone 16.1.
 *
 * Maps supported font names to next/font/google instances.
 * Returns CSS variable names for MUI typography consumption.
 *
 * Design:
 * - next/font/google constructors MUST be called at module scope (Next.js requirement).
 * - All font loader arguments MUST be explicit string literals (Next.js compiler restriction).
 * - We pre-instantiate all supported fonts and select the correct one at runtime.
 *
 * Supported fonts (per Milestone 16.1 spec):
 *   Inter, Poppins, Montserrat, Playfair Display, Lora, Roboto, Open Sans
 */

import {
  Inter,
  Poppins,
  Montserrat,
  Playfair_Display,
  Lora,
  Roboto,
  Open_Sans,
} from "next/font/google";
import type { SupportedFont } from "@/types/branding";
import { TENANT_FONT_CSS_VAR } from "@/types/branding";

// ─── Module-Scope Font Instances ─────────────────────────────────────────────
// Each font is loaded with `display: swap` to avoid FOIT (flash of invisible text).
// The CSS variable must be an inline string literal per Next.js font loader rules.

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--tenant-font-family",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--tenant-font-family",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--tenant-font-family",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--tenant-font-family",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--tenant-font-family",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--tenant-font-family",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--tenant-font-family",
});

// ─── Font Registry ───────────────────────────────────────────────────────────

type FontEntry = {
  /** next/font className that preloads the font and scopes it. */
  className: string;
  /** CSS variable class (e.g. `__variable_xxx`) to inject as a CSS custom property. */
  variableClassName: string;
  /** The CSS font-family value produced by next/font (includes fallback). */
  style: { fontFamily: string };
};

const FONT_REGISTRY: Record<SupportedFont, FontEntry> = {
  Inter: {
    className: inter.className,
    variableClassName: inter.variable,
    style: inter.style,
  },
  Poppins: {
    className: poppins.className,
    variableClassName: poppins.variable,
    style: poppins.style,
  },
  Montserrat: {
    className: montserrat.className,
    variableClassName: montserrat.variable,
    style: montserrat.style,
  },
  "Playfair Display": {
    className: playfairDisplay.className,
    variableClassName: playfairDisplay.variable,
    style: playfairDisplay.style,
  },
  Lora: {
    className: lora.className,
    variableClassName: lora.variable,
    style: lora.style,
  },
  Roboto: {
    className: roboto.className,
    variableClassName: roboto.variable,
    style: roboto.style,
  },
  "Open Sans": {
    className: openSans.className,
    variableClassName: openSans.variable,
    style: openSans.style,
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the font entry for a supported font name, or null if unsupported.
 */
export function getFontEntry(fontName: SupportedFont | null): FontEntry | null {
  if (!fontName) return null;
  return FONT_REGISTRY[fontName] ?? null;
}

/**
 * Detects which SupportedFont matches a CSS font-family string.
 * Returns the font name if found, null otherwise.
 *
 * Matching is case-insensitive and checks if the font-family string
 * contains the font name (since font-family is a comma-separated list).
 */
export function detectSupportedFont(
  fontFamily: string
): SupportedFont | null {
  const lower = fontFamily.toLowerCase();
  const fonts: SupportedFont[] = [
    "Inter",
    "Poppins",
    "Montserrat",
    "Playfair Display",
    "Lora",
    "Roboto",
    "Open Sans",
  ];
  for (const font of fonts) {
    if (lower.includes(font.toLowerCase())) {
      return font;
    }
  }
  return null;
}

/**
 * Returns the CSS variable reference for MUI typography.
 * Example: `var(--tenant-font-family), "Helvetica Neue", Arial, sans-serif`
 */
export function getFontFamilyCssVar(): string {
  return `var(${TENANT_FONT_CSS_VAR}), "Helvetica Neue", Arial, sans-serif`;
}
