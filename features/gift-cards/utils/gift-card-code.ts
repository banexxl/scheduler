/**
 * Gift Card Code Utilities — Milestone 15.2.
 *
 * Generates secure gift card codes and handles hashing/normalization.
 * Codes are NOT stored in raw form after delivery.
 */

import { randomBytes, createHash } from "crypto";

// ─── Code Generation ─────────────────────────────────────────────────────────

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I (typo-resistant)
const SEGMENT_LENGTH = 4;
const SEGMENT_COUNT = 4;
const PREFIX = "GS"; // get-slot

/**
 * Generates a cryptographically secure gift card code.
 * Format: GS-XXXX-XXXX-XXXX-XXXX
 */
export function generateGiftCardCode(): string {
  const totalChars = SEGMENT_LENGTH * SEGMENT_COUNT;
  const bytes = randomBytes(totalChars);
  const segments: string[] = [];

  let charIndex = 0;
  for (let s = 0; s < SEGMENT_COUNT; s++) {
    let segment = "";
    for (let c = 0; c < SEGMENT_LENGTH; c++) {
      segment += CODE_CHARS[bytes[charIndex]! % CODE_CHARS.length];
      charIndex++;
    }
    segments.push(segment);
  }

  return `${PREFIX}-${segments.join("-")}`;
}

/**
 * Normalizes a gift card code for comparison/hashing.
 * Strips whitespace, uppercases, removes hyphens for hashing.
 */
export function normalizeGiftCardCode(input: string): string {
  return input.trim().toUpperCase().replace(/[-\s]/g, "");
}

/**
 * Hashes a gift card code using SHA-256.
 * The raw code is NEVER stored; only this hash is persisted.
 */
export function hashGiftCardCode(rawCode: string): string {
  const normalized = normalizeGiftCardCode(rawCode);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Extracts the display prefix from a code (first segment after prefix).
 * Used for display/search without revealing the full code.
 */
export function getCodePrefix(rawCode: string): string {
  // GS-XXXX-XXXX-XXXX-XXXX → "GS-XXXX"
  const parts = rawCode.split("-");
  return parts.slice(0, 2).join("-");
}

/**
 * Formats a code for display (adds hyphens if missing).
 */
export function formatCodeForDisplay(rawCode: string): string {
  // Already formatted if it contains hyphens
  if (rawCode.includes("-")) return rawCode.toUpperCase();

  // Otherwise chunk into segments
  const upper = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const chunks: string[] = [];
  for (let i = 0; i < upper.length; i += SEGMENT_LENGTH) {
    chunks.push(upper.slice(i, i + SEGMENT_LENGTH));
  }
  return `${PREFIX}-${chunks.join("-")}`;
}
