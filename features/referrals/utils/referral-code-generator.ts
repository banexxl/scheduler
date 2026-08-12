/**
 * Referral Code Generator — Milestone 15.3.
 *
 * Generates short, shareable, non-sequential referral codes.
 * These are intended to be shared publicly — no secrecy needed.
 */

import { randomBytes } from "crypto";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // typo-resistant

/**
 * Generates a referral code.
 * Format: PREFIX-XXXX (8 chars total after prefix)
 */
export function generateReferralCode(prefix?: string): string {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }

  if (prefix) {
    // Use first 3 chars of prefix (uppercase, alphanumeric only)
    const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 3);
    return `${cleanPrefix}-${code}`;
  }

  return code;
}

/**
 * Normalizes a referral code for lookup.
 */
export function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s/g, "");
}
