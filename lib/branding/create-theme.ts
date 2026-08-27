/**
 * MUI Theme Generator — Milestone 16.1.
 *
 * Generates a Material UI theme from a ResolvedTenantTheme.
 * Configures palette, typography (including h1–h6), shape, and component overrides.
 *
 * The font family is consumed via CSS variable so the same theme object
 * works regardless of which Google Font is loaded.
 */

import { createTheme, type Theme } from "@mui/material/styles";
import type { ResolvedTenantTheme } from "@/types/branding";
import { getFontFamilyCssVar } from "./font-loader";

/**
 * Creates a fully configured MUI theme from resolved tenant branding.
 *
 * Configures:
 * - palette.primary / secondary
 * - palette.background.default / paper
 * - palette.text.primary / secondary
 * - palette.divider
 * - typography.fontFamily + h1–h6 weights/sizes
 * - shape.borderRadius
 * - Component overrides (Button textTransform)
 */
export function createTenantTheme(branding: ResolvedTenantTheme): Theme {
  const fontFamily = getFontFamilyCssVar();

  return createTheme({
    palette: {
      mode: branding.appearance,
      primary: { main: branding.primaryColor },
      secondary: { main: branding.accentColor },
      background: {
        default: branding.backgroundColor,
        paper: branding.surfaceColor,
      },
      text: {
        primary: branding.textColor,
        secondary: branding.mutedTextColor,
      },
      divider: branding.borderColor,
    },
    typography: {
      fontFamily,
      h1: {
        fontFamily,
        fontWeight: 800,
        fontSize: "2.5rem",
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontFamily,
        fontWeight: 700,
        fontSize: "2rem",
        lineHeight: 1.25,
        letterSpacing: "-0.01em",
      },
      h3: {
        fontFamily,
        fontWeight: 700,
        fontSize: "1.75rem",
        lineHeight: 1.3,
      },
      h4: {
        fontFamily,
        fontWeight: 600,
        fontSize: "1.5rem",
        lineHeight: 1.35,
      },
      h5: {
        fontFamily,
        fontWeight: 600,
        fontSize: "1.25rem",
        lineHeight: 1.4,
      },
      h6: {
        fontFamily,
        fontWeight: 600,
        fontSize: "1.125rem",
        lineHeight: 1.45,
      },
    },
    shape: {
      borderRadius: branding.borderRadius,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none" as const },
        },
      },
    },
  });
}
