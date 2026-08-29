/**
 * Premium Dashboard Design Tokens — Dark-first SaaS aesthetic.
 *
 * Inspired by Linear, Stripe, and Raycast.
 * Purple accent (#7C3AED range).
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const dashboardColors = {
  // Backgrounds
  bg: {
    primary: "#0a0a0f",
    secondary: "#111118",
    card: "#16161e",
    cardHover: "#1c1c26",
    elevated: "#1e1e28",
    glass: "rgba(22, 22, 30, 0.7)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
  },

  // Accent
  accent: {
    primary: "#7C3AED",
    primaryLight: "#8B5CF6",
    primaryDark: "#6D28D9",
    primaryGlow: "rgba(124, 58, 237, 0.15)",
    primaryBorder: "rgba(124, 58, 237, 0.3)",
    secondary: "#06B6D4",
    secondaryGlow: "rgba(6, 182, 212, 0.15)",
  },

  // Text
  text: {
    primary: "#f0f0f5",
    secondary: "#8b8b9e",
    muted: "#5c5c72",
    accent: "#a78bfa",
  },

  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    default: "rgba(255, 255, 255, 0.08)",
    hover: "rgba(255, 255, 255, 0.12)",
    accent: "rgba(124, 58, 237, 0.3)",
  },

  // Status
  status: {
    success: "#10B981",
    successGlow: "rgba(16, 185, 129, 0.15)",
    warning: "#F59E0B",
    warningGlow: "rgba(245, 158, 11, 0.15)",
    error: "#EF4444",
    errorGlow: "rgba(239, 68, 68, 0.15)",
    info: "#3B82F6",
    infoGlow: "rgba(59, 130, 246, 0.15)",
  },

  // Gradients
  gradient: {
    purple: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
    purpleSubtle: "linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(91, 33, 182, 0.05) 100%)",
    card: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 50%)",
  },
} as const;

// ─── Spacing & Radii ─────────────────────────────────────────────────────────

export const dashboardLayout = {
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 24,
  },
  spacing: {
    section: 32,
    card: 24,
    inner: 16,
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const dashboardTypography = {
  hero: {
    fontSize: "1.75rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.03em",
    color: dashboardColors.text.primary,
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "-0.01em",
    color: dashboardColors.text.primary,
  },
  metricValue: {
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    color: dashboardColors.text.primary,
  },
  metricLabel: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: dashboardColors.text.secondary,
  },
  body: {
    fontSize: "0.875rem",
    color: dashboardColors.text.secondary,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: "0.75rem",
    color: dashboardColors.text.muted,
  },
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────

export const dashboardMotion = {
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  stagger: {
    animate: { transition: { staggerChildren: 0.08 } },
  },
  hover: {
    scale: 1.01,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.98,
  },
} as const;
