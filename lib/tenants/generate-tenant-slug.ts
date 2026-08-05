/**
 * Generates a URL-safe tenant slug from a business name.
 *
 * Rules:
 * - Trim whitespace
 * - Convert to lowercase
 * - Normalize Unicode (NFD) and remove diacritics
 * - Remove apostrophes
 * - Replace spaces and separators with hyphens
 * - Remove unsupported characters (only a-z, 0-9, hyphen allowed)
 * - Collapse repeated hyphens
 * - Remove leading and trailing hyphens
 * - Limit to 63 characters
 * - Avoid ending on a hyphen after truncation
 *
 * Examples:
 *   "John's Barbershop"  → "johns-barbershop"
 *   "Bella Beauty Studio" → "bella-beauty-studio"
 *   "Željko Salon"       → "zeljko-salon"
 *   "Dental Clinic"      → "dental-clinic"
 */
export function generateTenantSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      // Normalize Unicode and strip diacritical marks
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Handle common ligatures / special chars
      .replace(/ø/g, "o")
      .replace(/æ/g, "ae")
      .replace(/ß/g, "ss")
      .replace(/đ/g, "dj")
      // Remove apostrophes and similar
      .replace(/[''`]/g, "")
      // Replace spaces, underscores, and other separators with hyphens
      .replace(/[\s_/\\|]+/g, "-")
      // Remove any characters that are not lowercase letters, digits, or hyphens
      .replace(/[^a-z0-9-]/g, "")
      // Collapse repeated hyphens
      .replace(/-{2,}/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+/, "")
      .replace(/-+$/, "")
      // Limit to 63 characters
      .slice(0, 63)
      // Remove trailing hyphen if truncation created one
      .replace(/-+$/, "")
  );
}
