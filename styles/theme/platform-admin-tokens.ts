/**
 * Platform Admin Design Tokens — Milestone 14.1.
 *
 * Extends the base MUI theme with platform-specific visual tokens.
 * Used exclusively by the Platform Admin shell and its pages.
 *
 * Design principles:
 * - Restrained neutral surfaces
 * - Clear typography hierarchy
 * - Subtle borders, limited elevation
 * - Information-dense but not crowded
 * - Consistent spacing via theme increments
 */

// ─── Layout ──────────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const TOP_BAR_HEIGHT = 56;

// ─── Palette ─────────────────────────────────────────────────────────────────

export const platformPalette = {
  sidebar: {
    bg: "#1a1f2e",
    bgHover: "#252b3b",
    bgActive: "#2d3548",
    text: "#b4bcd0",
    textActive: "#ffffff",
    border: "#2d3548",
    accent: "#5b8def",
  },
  topBar: {
    bg: "#ffffff",
    border: "#e5e7eb",
    text: "#1f2937",
    textSecondary: "#6b7280",
  },
  page: {
    bg: "#f8f9fb",
    surface: "#ffffff",
    surfaceBorder: "#e5e7eb",
    surfaceHover: "#f9fafb",
  },
  status: {
    success: "#10b981",
    successBg: "#ecfdf5",
    warning: "#f59e0b",
    warningBg: "#fffbeb",
    error: "#ef4444",
    errorBg: "#fef2f2",
    info: "#3b82f6",
    infoBg: "#eff6ff",
    neutral: "#6b7280",
    neutralBg: "#f3f4f6",
  },
  metric: {
    primary: "#1e40af",
    secondary: "#6b7280",
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const platformTypography = {
  pageTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "-0.02em",
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  cardTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body: {
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.5,
  },
  secondary: {
    fontSize: "0.8125rem",
    fontWeight: 400,
    lineHeight: 1.5,
    color: "#6b7280",
  },
  caption: {
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: 1.4,
    color: "#9ca3af",
  },
  metricValue: {
    fontSize: "1.75rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: 1.4,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const platformSpacing = {
  page: { px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } },
  section: { gap: 3 },
  card: { p: { xs: 2, sm: 2.5 } },
  compact: { p: 1.5 },
} as const;

// ─── Borders & Shadows ───────────────────────────────────────────────────────

export const platformSurface = {
  border: "1px solid #e5e7eb",
  borderRadius: 2, // theme units (8px × 2 = 16px)
  borderRadiusSm: 1.5,
  shadow: "none",
  elevatedShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
} as const;
