/**
 * Branding Color Utilities — Milestone 14.4.
 *
 * Hex validation, normalization, and WCAG contrast checking.
 */

// ─── Validation ──────────────────────────────────────────────────────────────

const HEX_6 = /^#[0-9a-fA-F]{6}$/;
const HEX_3 = /^#[0-9a-fA-F]{3}$/;

/**
 * Validates and normalizes a hex color to #RRGGBB format.
 * Returns null if invalid.
 */
export function normalizeHexColor(input: string): string | null {
  const trimmed = input.trim();

  if (HEX_6.test(trimmed)) return trimmed.toLowerCase();

  if (HEX_3.test(trimmed)) {
    // Expand #RGB to #RRGGBB
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return null;
}

/**
 * Returns true if the string is a valid hex color (#RGB or #RRGGBB).
 */
export function isValidHexColor(input: string): boolean {
  return normalizeHexColor(input) !== null;
}

// ─── Contrast ────────────────────────────────────────────────────────────────

/**
 * Parses a #RRGGBB hex color to [R, G, B] (0-255).
 */
function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return [0, 0, 0];
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return [r, g, b];
}

/**
 * Calculates relative luminance per WCAG 2.1.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const channels = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/**
 * Calculates WCAG contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(color1: string, color2: string): number {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true if the contrast meets WCAG AA for normal text (≥4.5:1).
 */
export function meetsWcagAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Returns true if the contrast meets WCAG AA for large text (≥3:1).
 */
export function meetsWcagAALarge(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 3;
}

/**
 * Given a background color, returns the best foreground (black or white)
 * for readable text.
 */
export function resolveForeground(background: string): "#000000" | "#ffffff" {
  const [r, g, b] = hexToRgb(background);
  const lum = relativeLuminance(r, g, b);
  // If background is light, use dark text; if dark, use light text
  return lum > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Derives a muted text color from a background.
 */
export function resolveMutedText(background: string): string {
  const [r, g, b] = hexToRgb(background);
  const lum = relativeLuminance(r, g, b);
  return lum > 0.179 ? "#6b7280" : "#9ca3af";
}

/**
 * Derives a border color from a background.
 */
export function resolveBorderColor(background: string): string {
  const [r, g, b] = hexToRgb(background);
  const lum = relativeLuminance(r, g, b);
  return lum > 0.179 ? "#e5e7eb" : "#374151";
}
