/**
 * Tenant Business App Design Tokens — Premium Dark Theme.
 *
 * Dark-first, purple accent, Linear-quality SaaS aesthetic.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────

export const TENANT_SIDEBAR_WIDTH = 240;
export const TENANT_TOP_BAR_HEIGHT = 52;

// ─── Palette ─────────────────────────────────────────────────────────────────

export const tenantPalette = {
  sidebar: {
    bg: "#0e0e14",
    bgHover: "#1a1a24",
    bgActive: "#1e1a2e",
    text: "#8b8b9e",
    textActive: "#f0f0f5",
    border: "rgba(255, 255, 255, 0.06)",
    iconDefault: "#5c5c72",
    iconActive: "#8B5CF6",
    groupLabel: "#5c5c72",
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
  accent: {
    primary: "#7C3AED",
    primaryLight: "#1e1a2e",
    warm: "#F59E0B",
    warmLight: "rgba(245, 158, 11, 0.1)",
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
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const tenantTypography = {
  pageTitle: {
    fontSize: "1.375rem",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
    color: "#f0f0f5",
  },
  sectionTitle: {
    fontSize: "1rem",
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
  navItem: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  navGroup: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
} as const;

// ─── Surfaces ────────────────────────────────────────────────────────────────

export const tenantSurface = {
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 2,
  borderRadiusSm: 1.5,
} as const;
