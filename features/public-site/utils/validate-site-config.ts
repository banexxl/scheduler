/**
 * Site Config Validation — Milestone 15.13.
 *
 * Validates and sanitizes tenant public site configuration.
 * Ensures:
 * - Known section types only
 * - No duplicate sections
 * - Text length limits
 * - Safe URL protocols
 * - Valid referenced IDs format
 * - No executable content
 */

import {
  type TenantPublicSiteConfig,
  type SiteSection,
  type HeroConfig,
  type AboutConfig,
  type FaqEntry,
  type SocialLink,
  type SiteSectionType,
  type ServicesSectionConfig,
  SITE_SECTION_TYPES,
  ALLOWED_SOCIAL_PLATFORMS,
  SITE_CONFIG_LIMITS,
  DEFAULT_SITE_CONFIG,
} from "../types/site-config";

// ─── URL Safety ──────────────────────────────────────────────────────────────

const SAFE_URL_PROTOCOLS = ["https:", "http:"];

/**
 * Validates a URL is safe (no javascript:, data:, vbscript:).
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > SITE_CONFIG_LIMITS.socialUrlMax) return false;

  try {
    const parsed = new URL(trimmed);
    return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // Relative URLs are not allowed for social links
    return false;
  }
}

// ─── UUID format check ───────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

// ─── Text sanitization (strips any potential HTML) ───────────────────────────

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  // Strip HTML tags
  const stripped = value.replace(/<[^>]*>/g, "").trim();
  if (stripped.length === 0) return null;
  return stripped.slice(0, maxLength);
}

// ─── Resolve Config ──────────────────────────────────────────────────────────

/**
 * Resolves raw JSONB into a validated TenantPublicSiteConfig.
 * Falls back to defaults for missing/invalid fields.
 * Never throws — always returns a safe config.
 */
export function resolveSiteConfig(raw: unknown): TenantPublicSiteConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_SITE_CONFIG;
  }

  const obj = raw as Record<string, unknown>;

  return {
    schemaVersion: 1,
    hero: resolveHero(obj.hero),
    sections: resolveSections(obj.sections),
    about: resolveAbout(obj.about),
    services: resolveServicesConfig(obj.services),
    faq: resolveFaq(obj.faq),
    socialLinks: resolveSocialLinks(obj.socialLinks),
    seo: resolveSeo(obj.seo),
  };
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function resolveHero(raw: unknown): HeroConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_SITE_CONFIG.hero;
  const obj = raw as Record<string, unknown>;

  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
    headline: sanitizeText(obj.headline, SITE_CONFIG_LIMITS.heroHeadline),
    subheadline: sanitizeText(obj.subheadline, SITE_CONFIG_LIMITS.heroSubheadline),
    primaryCtaLabel: sanitizeText(obj.primaryCtaLabel, SITE_CONFIG_LIMITS.heroCtaLabel) ?? "Book Now",
    secondaryCtaLabel: sanitizeText(obj.secondaryCtaLabel, SITE_CONFIG_LIMITS.heroCtaLabel),
    secondaryCtaUrl: resolveCtaUrl(obj.secondaryCtaUrl),
  };
}

function resolveCtaUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  // Allow only safe absolute URLs or internal anchor links
  const trimmed = raw.trim();
  if (trimmed.startsWith("#")) return trimmed.slice(0, 100);
  if (isSafeUrl(trimmed)) return trimmed;
  return null;
}

// ─── Sections ────────────────────────────────────────────────────────────────

function resolveSections(raw: unknown): SiteSection[] {
  if (!Array.isArray(raw)) return DEFAULT_SITE_CONFIG.sections;

  const seen = new Set<SiteSectionType>();
  const result: SiteSection[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const type = entry.type as string;

    if (!SITE_SECTION_TYPES.includes(type as SiteSectionType)) continue;
    if (seen.has(type as SiteSectionType)) continue; // No duplicates
    if (result.length >= SITE_CONFIG_LIMITS.maxSections) break;

    seen.add(type as SiteSectionType);
    result.push({
      type: type as SiteSectionType,
      enabled: typeof entry.enabled === "boolean" ? entry.enabled : false,
    });
  }

  // Ensure all known types are present (disabled by default if missing)
  for (const type of SITE_SECTION_TYPES) {
    if (type === "hero") continue; // Hero is separate
    if (!seen.has(type)) {
      result.push({ type, enabled: false });
    }
  }

  return result;
}

// ─── About ───────────────────────────────────────────────────────────────────

function resolveAbout(raw: unknown): AboutConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_SITE_CONFIG.about;
  const obj = raw as Record<string, unknown>;

  return {
    title: sanitizeText(obj.title, SITE_CONFIG_LIMITS.aboutTitle),
    body: sanitizeText(obj.body, SITE_CONFIG_LIMITS.aboutBody),
    mediaAssetId: isValidUuid(obj.mediaAssetId) ? obj.mediaAssetId : null,
  };
}

// ─── Services Config ─────────────────────────────────────────────────────────

function resolveServicesConfig(raw: unknown): ServicesSectionConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_SITE_CONFIG.services;
  const obj = raw as Record<string, unknown>;

  const featuredIds = Array.isArray(obj.featuredServiceIds)
    ? (obj.featuredServiceIds as unknown[])
        .filter(isValidUuid)
        .slice(0, SITE_CONFIG_LIMITS.featuredServicesMax)
    : [];

  return {
    heading: sanitizeText(obj.heading, SITE_CONFIG_LIMITS.aboutTitle),
    featuredServiceIds: featuredIds,
    showCategories: typeof obj.showCategories === "boolean" ? obj.showCategories : true,
    displayMode: obj.displayMode === "list" ? "list" : "grid",
  };
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

function resolveFaq(raw: unknown): FaqEntry[] {
  if (!Array.isArray(raw)) return [];

  const result: FaqEntry[] = [];
  for (const item of raw) {
    if (result.length >= SITE_CONFIG_LIMITS.faqMaxEntries) break;
    if (!item || typeof item !== "object") continue;

    const entry = item as Record<string, unknown>;
    const question = sanitizeText(entry.question, SITE_CONFIG_LIMITS.faqQuestion);
    const answer = sanitizeText(entry.answer, SITE_CONFIG_LIMITS.faqAnswer);

    if (question && answer) {
      result.push({ question, answer });
    }
  }

  return result;
}

// ─── Social Links ────────────────────────────────────────────────────────────

function resolveSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];

  const result: SocialLink[] = [];
  const seenPlatforms = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;

    const platform = entry.platform as string;
    if (!ALLOWED_SOCIAL_PLATFORMS.includes(platform as never)) continue;
    if (seenPlatforms.has(platform)) continue;

    const url = typeof entry.url === "string" ? entry.url.trim() : "";
    if (!isSafeUrl(url)) continue;

    seenPlatforms.add(platform);
    result.push({ platform: platform as SocialLink["platform"], url });
  }

  return result;
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function resolveSeo(raw: unknown): TenantPublicSiteConfig["seo"] {
  if (!raw || typeof raw !== "object") return DEFAULT_SITE_CONFIG.seo;
  const obj = raw as Record<string, unknown>;

  return {
    metaTitle: sanitizeText(obj.metaTitle, SITE_CONFIG_LIMITS.seoMetaTitle),
    metaDescription: sanitizeText(obj.metaDescription, SITE_CONFIG_LIMITS.seoMetaDescription),
  };
}

// ─── Validation Result (for editor UI feedback) ──────────────────────────────

export type SiteConfigValidationError = {
  field: string;
  message: string;
};

/**
 * Validates a config and returns errors (for editor save).
 * Unlike resolveSiteConfig which silently fixes, this reports issues.
 */
export function validateSiteConfigForSave(config: TenantPublicSiteConfig): SiteConfigValidationError[] {
  const errors: SiteConfigValidationError[] = [];

  // Hero
  if (config.hero.headline && config.hero.headline.length > SITE_CONFIG_LIMITS.heroHeadline) {
    errors.push({ field: "hero.headline", message: `Maximum ${SITE_CONFIG_LIMITS.heroHeadline} characters` });
  }
  if (config.hero.subheadline && config.hero.subheadline.length > SITE_CONFIG_LIMITS.heroSubheadline) {
    errors.push({ field: "hero.subheadline", message: `Maximum ${SITE_CONFIG_LIMITS.heroSubheadline} characters` });
  }
  if (config.hero.secondaryCtaUrl && !isSafeUrl(config.hero.secondaryCtaUrl) && !config.hero.secondaryCtaUrl.startsWith("#")) {
    errors.push({ field: "hero.secondaryCtaUrl", message: "URL must use https:// or http://" });
  }

  // Sections
  const sectionTypes = config.sections.map(s => s.type);
  const uniqueTypes = new Set(sectionTypes);
  if (uniqueTypes.size !== sectionTypes.length) {
    errors.push({ field: "sections", message: "Duplicate section types are not allowed" });
  }
  for (const section of config.sections) {
    if (!SITE_SECTION_TYPES.includes(section.type)) {
      errors.push({ field: "sections", message: `Unknown section type: ${section.type}` });
    }
  }

  // About
  if (config.about.body && config.about.body.length > SITE_CONFIG_LIMITS.aboutBody) {
    errors.push({ field: "about.body", message: `Maximum ${SITE_CONFIG_LIMITS.aboutBody} characters` });
  }

  // FAQ
  if (config.faq.length > SITE_CONFIG_LIMITS.faqMaxEntries) {
    errors.push({ field: "faq", message: `Maximum ${SITE_CONFIG_LIMITS.faqMaxEntries} FAQ entries` });
  }

  // Social links
  for (const link of config.socialLinks) {
    if (!isSafeUrl(link.url)) {
      errors.push({ field: `socialLinks.${link.platform}`, message: "Invalid or unsafe URL" });
    }
  }

  // SEO
  if (config.seo.metaTitle && config.seo.metaTitle.length > SITE_CONFIG_LIMITS.seoMetaTitle) {
    errors.push({ field: "seo.metaTitle", message: `Maximum ${SITE_CONFIG_LIMITS.seoMetaTitle} characters` });
  }
  if (config.seo.metaDescription && config.seo.metaDescription.length > SITE_CONFIG_LIMITS.seoMetaDescription) {
    errors.push({ field: "seo.metaDescription", message: `Maximum ${SITE_CONFIG_LIMITS.seoMetaDescription} characters` });
  }

  return errors;
}
