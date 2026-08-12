/**
 * Customer App Design Tokens — Milestone 14.3.
 *
 * Consumer-friendly, mobile-first, calm and trustworthy.
 * Softer surfaces, generous spacing, large touch targets.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────

export const CUSTOMER_TOP_BAR_HEIGHT = 56;
export const CUSTOMER_MAX_WIDTH = 680;

// ─── Palette ─────────────────────────────────────────────────────────────────

export const customerPalette = {
  topBar: {
    bg: "#ffffff",
    border: "#f0f0f0",
    text: "#1f2937",
    textSecondary: "#6b7280",
  },
  page: {
    bg: "#fafafa",
    surface: "#ffffff",
    surfaceBorder: "#f0f0f0",
    surfaceHover: "#f9fafb",
  },
  accent: {
    primary: "#2563eb",
    primaryLight: "#eff6ff",
    primaryDark: "#1d4ed8",
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
  card: {
    shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)",
    border: "#f0f0f0",
    radius: 12,
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const customerTypography = {
  pageTitle: {
    fontSize: "1.375rem",
    fontWeight: 700,
    lineHeight: 1.3,
    color: "#111827",
  },
  greeting: {
    fontSize: "1.25rem",
    fontWeight: 600,
    lineHeight: 1.3,
    color: "#111827",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.4,
    color: "#374151",
  },
  cardTitle: {
    fontSize: "0.9375rem",
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
  meta: {
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
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const customerSpacing = {
  page: { px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } },
  card: { p: { xs: 2, sm: 2.5 } },
  section: { gap: 2.5 },
} as const;
