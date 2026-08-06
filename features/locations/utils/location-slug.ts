import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";

/**
 * Generates a location slug from a location name.
 * Reuses the tenant slug generator since the rules are the same.
 */
export function generateLocationSlug(value: string): string {
  return generateTenantSlug(value);
}

/**
 * Normalizes a location slug.
 */
export function normalizeLocationSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * Validates location slug format.
 * Location slugs: 2–63 chars, lowercase letters/digits/hyphens,
 * no leading/trailing/repeated hyphens.
 */
export function isValidLocationSlugFormat(slug: string): boolean {
  const normalized = normalizeLocationSlug(slug);
  if (normalized.length < 2 || normalized.length > 63) return false;
  if (normalized.includes("--")) return false;
  // Must start with letter, end with letter/digit
  return /^[a-z][a-z0-9-]*[a-z0-9]$/.test(normalized) || /^[a-z][a-z0-9]?$/.test(normalized);
}
