/**
 * Tenant Business App Design Tokens — Milestone 14.2.
 *
 * Design direction: Modern, warm, professional, operational.
 * Calmer than a generic admin template. Suitable for daily use.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────

export const TENANT_SIDEBAR_WIDTH = 240;
export const TENANT_TOP_BAR_HEIGHT = 52;

// ─── Palette ─────────────────────────────────────────────────────────────────

export const tenantPalette = {
  sidebar: {
    bg: "#ffffff",
    bgHover: "#f3f4f6",
    bgActive: "#eff6ff",
    text: "#4b5563",
    textActive: "#1d4ed8",
    border: "#e5e7eb",
    iconDefault: "#9ca3af",
    iconActive: "#2563eb",
    groupLabel: "#9ca3af",
  },
  topBar: {
    bg: "#ffffff",
    border: "#e5e7eb",
    text: "#1f2937",
    textSecondary: "#6b7280",
  },
  page: {
    bg: "#f9fafb",
    surface: "#ffffff",
    surfaceBorder: "#e5e7eb",
    surfaceHover: "#f9fafb",
  },
  accent: {
    primary: "#2563eb",
    primaryLight: "#eff6ff",
    warm: "#f59e0b",
    warmLight: "#fffbeb",
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
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const tenantTypography = {
  pageTitle: {
    fontSize: "1.375rem",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
    color: "#111827",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.4,
    color: "#1f2937",
  },
  cardTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.4,
    color: "#1f2937",
  },
  body: {
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.5,
    color: "#374151",
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
  border: "1px solid #e5e7eb",
  borderRadius: 2,
  borderRadiusSm: 1.5,
} as const;
