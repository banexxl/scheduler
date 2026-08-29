import "server-only";

/**
 * Portal Utilities — Originally Milestone 8.6, simplified.
 *
 * The custom token/session tables have been removed.
 * Auth is now handled entirely by Supabase Auth (signInWithOtp magic link).
 *
 * This file retains only the normalizeEmail helper used elsewhere.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
