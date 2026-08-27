import { describe, it, expect } from "vitest";
import {
  HOMEPAGE_SECTION_IDS,
  HOMEPAGE_SECTION_LABELS,
  CTA_TARGETS,
  CTA_TARGET_LABELS,
  DEFAULT_HOMEPAGE_CONTENT,
  HOMEPAGE_LIMITS,
} from "../types";

/**
 * Homepage Builder Types Tests — Milestone 16.4.
 */

describe("HOMEPAGE_SECTION_IDS", () => {
  it("contains all expected sections", () => {
    expect(HOMEPAGE_SECTION_IDS).toContain("hero");
    expect(HOMEPAGE_SECTION_IDS).toContain("about");
    expect(HOMEPAGE_SECTION_IDS).toContain("services");
    expect(HOMEPAGE_SECTION_IDS).toContain("staff");
    expect(HOMEPAGE_SECTION_IDS).toContain("gallery");
    expect(HOMEPAGE_SECTION_IDS).toContain("testimonials");
    expect(HOMEPAGE_SECTION_IDS).toContain("cta");
  });

  it("every section has a label", () => {
    for (const id of HOMEPAGE_SECTION_IDS) {
      expect(HOMEPAGE_SECTION_LABELS[id]).toBeTruthy();
    }
  });
});

describe("CTA_TARGETS", () => {
  it("contains valid targets", () => {
    expect(CTA_TARGETS).toContain("services");
    expect(CTA_TARGETS).toContain("staff");
    expect(CTA_TARGETS).toContain("locations");
    expect(CTA_TARGETS).toContain("booking");
  });

  it("every target has a label", () => {
    for (const t of CTA_TARGETS) {
      expect(CTA_TARGET_LABELS[t]).toBeTruthy();
    }
  });
});

describe("DEFAULT_HOMEPAGE_CONTENT", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_HOMEPAGE_CONTENT.heroCtaLabel).toBe("Book Now");
    expect(DEFAULT_HOMEPAGE_CONTENT.heroCtaTarget).toBe("services");
    expect(DEFAULT_HOMEPAGE_CONTENT.heroTitle).toBeNull();
    expect(DEFAULT_HOMEPAGE_CONTENT.aboutTitle).toBeNull();
    expect(DEFAULT_HOMEPAGE_CONTENT.aboutBody).toBeNull();
  });

  it("default section order includes all sections", () => {
    for (const id of HOMEPAGE_SECTION_IDS) {
      expect(DEFAULT_HOMEPAGE_CONTENT.sectionOrder).toContain(id);
    }
  });

  it("default visibility has hero and services enabled", () => {
    expect(DEFAULT_HOMEPAGE_CONTENT.sectionVisibility.hero).toBe(true);
    expect(DEFAULT_HOMEPAGE_CONTENT.sectionVisibility.services).toBe(true);
    expect(DEFAULT_HOMEPAGE_CONTENT.sectionVisibility.cta).toBe(true);
  });

  it("default visibility has about and gallery disabled", () => {
    expect(DEFAULT_HOMEPAGE_CONTENT.sectionVisibility.about).toBe(false);
    expect(DEFAULT_HOMEPAGE_CONTENT.sectionVisibility.gallery).toBe(false);
    expect(DEFAULT_HOMEPAGE_CONTENT.sectionVisibility.testimonials).toBe(false);
  });
});

describe("HOMEPAGE_LIMITS", () => {
  it("hero title limit is reasonable", () => {
    expect(HOMEPAGE_LIMITS.heroTitle).toBe(120);
    expect(HOMEPAGE_LIMITS.heroSubtitle).toBe(250);
    expect(HOMEPAGE_LIMITS.heroCtaLabel).toBe(40);
  });

  it("gallery limit is 12", () => {
    expect(HOMEPAGE_LIMITS.maxGalleryImages).toBe(12);
  });

  it("testimonial limit is 20", () => {
    expect(HOMEPAGE_LIMITS.maxTestimonials).toBe(20);
  });

  it("about body limit is 3000", () => {
    expect(HOMEPAGE_LIMITS.aboutBody).toBe(3000);
  });
});
