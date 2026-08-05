import { isReservedSlug } from "@/lib/constants/reserved-slugs";

/**
 * Tenant slug format regex.
 *
 * Rules:
 * - 3–63 characters
 * - Starts with a lowercase letter
 * - Ends with a lowercase letter or digit
 * - Contains only lowercase letters, digits, and single hyphens
 * - No repeated hyphens (enforced separately for clearer error messages)
 */
const SLUG_FORMAT_REGEX = /^[a-z][a-z0-9-]*[a-z0-9]$/;

/**
 * Normalizes a tenant slug for comparison and storage.
 * Trims whitespace and converts to lowercase.
 */
export function normalizeTenantSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * Checks whether a slug has valid format.
 *
 * Valid format:
 * - 3–63 characters
 * - Starts with a lowercase letter
 * - Ends with a letter or digit
 * - Only lowercase letters, digits, and hyphens
 * - No repeated hyphens
 */
export function isValidTenantSlugFormat(slug: string): boolean {
  const normalized = normalizeTenantSlug(slug);

  if (normalized.length < 3 || normalized.length > 63) {
    return false;
  }

  if (normalized.includes("--")) {
    return false;
  }

  return SLUG_FORMAT_REGEX.test(normalized);
}

/**
 * Checks whether a slug is reserved.
 * Re-exports the canonical reserved-slug check for convenience.
 */
export function isReservedTenantSlug(slug: string): boolean {
  return isReservedSlug(normalizeTenantSlug(slug));
}

/**
 * Full local slug validation.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateTenantSlugLocally(slug: string): string | null {
  const normalized = normalizeTenantSlug(slug);

  if (!normalized) {
    return "Business address is required";
  }

  if (normalized.length < 3) {
    return "Business address must be at least 3 characters";
  }

  if (normalized.length > 63) {
    return "Business address must be at most 63 characters";
  }

  if (normalized.includes("--")) {
    return "Must not contain repeated hyphens";
  }

  if (!SLUG_FORMAT_REGEX.test(normalized)) {
    return "Must start with a letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens";
  }

  if (isReservedTenantSlug(normalized)) {
    return "This address is reserved. Choose another one.";
  }

  return null;
}
