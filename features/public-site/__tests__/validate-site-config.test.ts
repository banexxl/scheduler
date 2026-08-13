/**
 * Site Config Validation Unit Tests — Milestone 15.13.
 */

import { describe, it, expect } from "vitest";
import {
  resolveSiteConfig,
  validateSiteConfigForSave,
  isSafeUrl,
} from "../utils/validate-site-config";
import { DEFAULT_SITE_CONFIG, SITE_SECTION_TYPES, SITE_CONFIG_LIMITS } from "../types/site-config";

describe("resolveSiteConfig", () => {
  it("returns default config for null input", () => {
    const result = resolveSiteConfig(null);
    expect(result.schemaVersion).toBe(1);
    expect(result.hero.enabled).toBe(true);
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it("returns default config for undefined input", () => {
    const result = resolveSiteConfig(undefined);
    expect(result).toEqual(DEFAULT_SITE_CONFIG);
  });

  it("returns default config for non-object input", () => {
    expect(resolveSiteConfig("string")).toEqual(DEFAULT_SITE_CONFIG);
    expect(resolveSiteConfig(123)).toEqual(DEFAULT_SITE_CONFIG);
    expect(resolveSiteConfig([])).toEqual(DEFAULT_SITE_CONFIG);
  });

  it("resolves valid hero config", () => {
    const result = resolveSiteConfig({
      hero: { enabled: false, headline: "Test", subheadline: "Sub" },
    });
    expect(result.hero.enabled).toBe(false);
    expect(result.hero.headline).toBe("Test");
    expect(result.hero.subheadline).toBe("Sub");
  });

  it("truncates overly long headline", () => {
    const longHeadline = "A".repeat(200);
    const result = resolveSiteConfig({ hero: { headline: longHeadline } });
    expect(result.hero.headline!.length).toBeLessThanOrEqual(SITE_CONFIG_LIMITS.heroHeadline);
  });

  it("strips HTML from text fields", () => {
    const result = resolveSiteConfig({
      hero: { headline: '<script>alert("xss")</script>Hello' },
      about: { body: '<img onerror="evil()">About text' },
    });
    expect(result.hero.headline).not.toContain("<script>");
    expect(result.hero.headline).toContain("Hello");
    expect(result.about.body).not.toContain("<img");
    expect(result.about.body).toContain("About text");
  });

  it("rejects unknown section types", () => {
    const result = resolveSiteConfig({
      sections: [
        { type: "services", enabled: true },
        { type: "malicious_type", enabled: true },
        { type: "about", enabled: true },
      ],
    });
    const types = result.sections.map(s => s.type);
    expect(types).not.toContain("malicious_type");
    expect(types).toContain("services");
    expect(types).toContain("about");
  });

  it("removes duplicate sections", () => {
    const result = resolveSiteConfig({
      sections: [
        { type: "services", enabled: true },
        { type: "services", enabled: false },
        { type: "about", enabled: true },
      ],
    });
    const servicesSections = result.sections.filter(s => s.type === "services");
    expect(servicesSections).toHaveLength(1);
  });

  it("ensures all known section types are present", () => {
    const result = resolveSiteConfig({ sections: [{ type: "services", enabled: true }] });
    // All types from registry (minus hero which is separate) should be present
    for (const type of SITE_SECTION_TYPES) {
      if (type === "hero") continue;
      expect(result.sections.find(s => s.type === type)).toBeDefined();
    }
  });

  it("limits max sections", () => {
    const tooMany = Array.from({ length: 20 }, (_, i) => ({ type: `type_${i}`, enabled: true }));
    const result = resolveSiteConfig({ sections: tooMany });
    expect(result.sections.length).toBeLessThanOrEqual(SITE_CONFIG_LIMITS.maxSections + SITE_SECTION_TYPES.length);
  });

  it("validates FAQ entries require both question and answer", () => {
    const result = resolveSiteConfig({
      faq: [
        { question: "Q1", answer: "A1" },
        { question: "", answer: "A2" },
        { question: "Q3", answer: "" },
        { question: "Q4", answer: "A4" },
      ],
    });
    expect(result.faq).toHaveLength(2);
    expect(result.faq[0]!.question).toBe("Q1");
    expect(result.faq[1]!.question).toBe("Q4");
  });

  it("limits FAQ entries to max", () => {
    const tooMany = Array.from({ length: 60 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` }));
    const result = resolveSiteConfig({ faq: tooMany });
    expect(result.faq.length).toBeLessThanOrEqual(SITE_CONFIG_LIMITS.faqMaxEntries);
  });

  it("validates social links with safe protocols only", () => {
    const result = resolveSiteConfig({
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/test" },
        { platform: "facebook", url: "javascript:alert(1)" },
        { platform: "tiktok", url: "data:text/html,<h1>evil</h1>" },
        { platform: "youtube", url: "https://youtube.com/@test" },
      ],
    });
    expect(result.socialLinks).toHaveLength(2);
    expect(result.socialLinks.map(l => l.platform)).toContain("instagram");
    expect(result.socialLinks.map(l => l.platform)).toContain("youtube");
    expect(result.socialLinks.map(l => l.platform)).not.toContain("facebook");
    expect(result.socialLinks.map(l => l.platform)).not.toContain("tiktok");
  });

  it("rejects unknown social platforms", () => {
    const result = resolveSiteConfig({
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/t" },
        { platform: "myspace", url: "https://myspace.com/t" },
      ],
    });
    expect(result.socialLinks).toHaveLength(1);
    expect(result.socialLinks[0]!.platform).toBe("instagram");
  });

  it("deduplicates social platforms", () => {
    const result = resolveSiteConfig({
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/first" },
        { platform: "instagram", url: "https://instagram.com/second" },
      ],
    });
    expect(result.socialLinks).toHaveLength(1);
    expect(result.socialLinks[0]!.url).toBe("https://instagram.com/first");
  });

  it("validates about.mediaAssetId as UUID", () => {
    const result = resolveSiteConfig({
      about: { mediaAssetId: "not-a-uuid" },
    });
    expect(result.about.mediaAssetId).toBeNull();

    const result2 = resolveSiteConfig({
      about: { mediaAssetId: "12345678-1234-1234-1234-123456789012" },
    });
    expect(result2.about.mediaAssetId).toBe("12345678-1234-1234-1234-123456789012");
  });

  it("validates featuredServiceIds as UUIDs", () => {
    const result = resolveSiteConfig({
      services: { featuredServiceIds: ["valid-id", "12345678-1234-1234-1234-123456789012", ""] },
    });
    expect(result.services.featuredServiceIds).toHaveLength(1);
    expect(result.services.featuredServiceIds[0]).toBe("12345678-1234-1234-1234-123456789012");
  });
});

describe("isSafeUrl", () => {
  it("accepts https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("https://instagram.com/user")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("JAVASCRIPT:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isSafeUrl("data:text/html,<h1>evil</h1>")).toBe(false);
  });

  it("rejects vbscript: URLs", () => {
    expect(isSafeUrl("vbscript:MsgBox")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isSafeUrl("")).toBe(false);
  });

  it("rejects overly long URLs", () => {
    const longUrl = "https://example.com/" + "a".repeat(600);
    expect(isSafeUrl(longUrl)).toBe(false);
  });

  it("rejects relative paths", () => {
    expect(isSafeUrl("/relative/path")).toBe(false);
    expect(isSafeUrl("relative")).toBe(false);
  });
});

describe("validateSiteConfigForSave", () => {
  it("returns no errors for default config", () => {
    const errors = validateSiteConfigForSave(DEFAULT_SITE_CONFIG);
    expect(errors).toHaveLength(0);
  });

  it("reports overly long headline", () => {
    const config = { ...DEFAULT_SITE_CONFIG, hero: { ...DEFAULT_SITE_CONFIG.hero, headline: "A".repeat(200) } };
    const errors = validateSiteConfigForSave(config);
    expect(errors.find(e => e.field === "hero.headline")).toBeDefined();
  });

  it("reports unsafe social URLs", () => {
    const config = {
      ...DEFAULT_SITE_CONFIG,
      socialLinks: [{ platform: "instagram" as const, url: "javascript:void(0)" }],
    };
    const errors = validateSiteConfigForSave(config);
    expect(errors.find(e => e.field.includes("socialLinks"))).toBeDefined();
  });

  it("reports too many FAQ entries", () => {
    const config = {
      ...DEFAULT_SITE_CONFIG,
      faq: Array.from({ length: 55 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` })),
    };
    const errors = validateSiteConfigForSave(config);
    expect(errors.find(e => e.field === "faq")).toBeDefined();
  });

  it("reports duplicate section types", () => {
    const config = {
      ...DEFAULT_SITE_CONFIG,
      sections: [
        { type: "services" as const, enabled: true },
        { type: "services" as const, enabled: false },
      ],
    };
    const errors = validateSiteConfigForSave(config);
    expect(errors.find(e => e.field === "sections")).toBeDefined();
  });
});
