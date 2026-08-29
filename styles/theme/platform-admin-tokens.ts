/**
 * Platform Admin Design Tokens — Premium Dark Theme.
 *
 * Dark-first, purple accent, information-dense command center aesthetic.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const TOP_BAR_HEIGHT = 56;

// ─── Palette ─────────────────────────────────────────────────────────────────

export const platformPalette = {
  sidebar: {
    bg: "#0e0e14",
    bgHover: "#1a1a24",
    bgActive: "#1e1a2e",
    text: "#8b8b9e",
    textActive: "#f0f0f5",
    border: "rgba(255, 255, 255, 0.06)",
    accent: "#8B5CF6",
  },
  topBar: {
    bg: "#111118",
    border: "rgba(255, 255, 255, 0.06)",
    text: "#f0f0f5",
    textSecondary: "#8b8b9e",
  },
  page: {
    bg: "#0a0a0f",
    surface: "#16161e",
    surfaceBorder: "rgba(255, 255, 255, 0.08)",
    surfaceHover: "#1c1c26",
  },
  status: {
    success: "#10B981",
    successBg: "rgba(16, 185, 129, 0.1)",
    warning: "#F59E0B",
    warningBg: "rgba(245, 158, 11, 0.1)",
    error: "#EF4444",
    errorBg: "rgba(239, 68, 68, 0.1)",
    info: "#3B82F6",
    infoBg: "rgba(59, 130, 246, 0.1)",
    neutral: "#8b8b9e",
    neutralBg: "rgba(139, 139, 158, 0.1)",
  },
  metric: {
    primary: "#8B5CF6",
    secondary: "#8b8b9e",
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const platformTypography = {
  pageTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "-0.02em",
    color: "#f0f0f5",
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: 1.4,
    color: "#f0f0f5",
  },
  cardTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.4,
    color: "#f0f0f5",
  },
  body: {
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.5,
    color: "#8b8b9e",
  },
  secondary: {
    fontSize: "0.8125rem",
    fontWeight: 400,
    lineHeight: 1.5,
    color: "#8b8b9e",
  },
  caption: {
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: 1.4,
    color: "#5c5c72",
  },
  metricValue: {
    fontSize: "1.75rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    color: "#f0f0f5",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: 1.4,
    color: "#8b8b9e",
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
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 2,
  borderRadiusSm: 1.5,
  shadow: "none",
  elevatedShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
} as const;
