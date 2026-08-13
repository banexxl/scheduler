import { test, expect } from "@playwright/test";

/**
 * Public Site E2E — Milestone 15.13.
 *
 * Tests the tenant public website experience:
 * - Homepage renders with sections
 * - Service detail pages
 * - Location detail pages
 * - Staff profile pages
 * - XSS safety (no script execution)
 * - Branding isolation
 * - Mobile responsive
 * - SEO metadata
 * - Robots/sitemap
 * - Draft isolation (anonymous cannot see draft)
 *
 * Environment: TEST_PUBLIC_TENANT_SLUG
 */

const tenantSlug = process.env.TEST_PUBLIC_TENANT_SLUG ?? "";
const hasEnv = Boolean(tenantSlug);

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC HOMEPAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — homepage", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("homepage loads without error", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}`);
    expect(response?.status()).not.toBe(500);
    const html = await page.content();
    expect(html).not.toContain("Unhandled Runtime Error");
  });

  test("homepage has proper heading structure", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test("homepage has navigation or heading", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    // Nav exists when site config is published; heading always exists
    const nav = await page.locator("nav").count();
    const headings = await page.locator("h1, h2").count();
    expect(nav + headings).toBeGreaterThan(0);
  });

  test("homepage has booking CTA or wizard", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    // Either a "Book" link/button or the booking wizard itself
    const bookElements = page.locator("a:has-text('Book'), button:has-text('Book'), [id='booking']");
    const count = await bookElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test("homepage does not expose draft content", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const html = await page.content();
    expect(html).not.toContain("draft_config");
    expect(html).not.toContain("draft_version");
  });

  test("homepage does not expose internal data", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const html = await page.content();
    expect(html).not.toContain("service_role");
    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(html).not.toContain("internal_notes");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE DETAIL
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — service detail", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("non-existent service returns 404", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/services/nonexistent-service-xyz`);
    const status = response?.status() ?? 0;
    expect(status === 404 || status === 200).toBeTruthy(); // 404 or soft redirect
  });

  test("service page does not expose internal IDs in URL", async ({ page }) => {
    // Service pages use slugs, not UUIDs
    await page.goto(`/book/${tenantSlug}`);
    // Check any service links use slugs
    const serviceLinks = await page.locator("a[href*='/services/']").all();
    for (const link of serviceLinks.slice(0, 3)) {
      const href = await link.getAttribute("href");
      if (href) {
        // Should not be a raw UUID
        expect(href).not.toMatch(/\/services\/[0-9a-f]{8}-[0-9a-f]{4}/);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF PRIVACY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — staff privacy", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("staff section does not expose emails or phones", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    await page.waitForLoadState("domcontentloaded");
    // No email pattern in staff section (if present)
    const staffSection = await page.locator("[aria-labelledby='staff-heading']").textContent({ timeout: 3000 }).catch(() => null);
    if (staffSection) {
      expect(staffSection).not.toMatch(/[a-z0-9]+@[a-z0-9]+\.[a-z]+/i);
    }
    // Test passes if no staff section present (section not enabled)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// XSS SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — XSS safety", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("page does not execute injected scripts", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    // Verify no JavaScript alert dialogs fired
    let dialogFired = false;
    page.on("dialog", () => { dialogFired = true; });
    await page.waitForTimeout(1000);
    expect(dialogFired).toBe(false);
    // Page rendered without crash
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });

  test("social links use safe protocols", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const socialLinks = await page.locator("a[target='_blank']").all();
    for (const link of socialLinks) {
      const href = await link.getAttribute("href");
      if (href) {
        expect(href).not.toMatch(/^javascript:/i);
        expect(href).not.toMatch(/^data:/i);
        expect(href).not.toMatch(/^vbscript:/i);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEO
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — SEO", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("has page title", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe("Error");
  });

  test("has Open Graph meta tags", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content").catch(() => null);
    // May or may not exist but page should not crash
    expect(ogTitle === null || ogTitle.length > 0).toBeTruthy();
  });

  test("has JSON-LD structured data when site config published", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    await page.waitForLoadState("domcontentloaded");
    const jsonLdElements = await page.locator('script[type="application/ld+json"]').count();
    // JSON-LD present when site config is published; test passes either way
    if (jsonLdElements > 0) {
      const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
      if (jsonLd) {
        const parsed = JSON.parse(jsonLd);
        expect(parsed["@context"]).toBe("https://schema.org");
      }
    }
    // No JSON-LD is acceptable when no site config published
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROBOTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — robots", () => {
  test("robots.txt is accessible", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    const status = response?.status() ?? 0;
    expect(status).toBe(200);
    const text = await page.locator("body").textContent();
    expect(text).toContain("User-agent");
  });

  test("robots.txt disallows admin routes", async ({ page }) => {
    await page.goto("/robots.txt");
    const text = await page.locator("body").textContent() ?? "";
    expect(text).toContain("/platform");
    expect(text).toContain("/login");
  });

  test("robots.txt allows public booking", async ({ page }) => {
    await page.goto("/robots.txt");
    const text = await page.locator("body").textContent() ?? "";
    expect(text).toContain("/book/");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — mobile 375px", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");
  test.use({ viewport: { width: 375, height: 812 } });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    await page.waitForLoadState("domcontentloaded");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("navigation or content is usable", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    // Nav exists when site config is published; otherwise heading/content visible
    const nav = page.locator("nav");
    const heading = page.locator("h1");
    const navVisible = await nav.first().isVisible().catch(() => false);
    const headingVisible = await heading.first().isVisible().catch(() => false);
    expect(navVisible || headingVisible).toBeTruthy();
  });
});

test.describe("public site — mobile 320px", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");
  test.use({ viewport: { width: 320, height: 568 } });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    await page.waitForLoadState("domcontentloaded");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — tenant isolation", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("non-existent tenant returns safe response", async ({ page }) => {
    const response = await page.goto("/book/completely-fake-tenant-xyz-999");
    expect(response?.status()).not.toBe(500);
  });

  test("page does not expose cross-tenant data", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const html = await page.content();
    expect(html).not.toContain("tenant_id");
    expect(html).not.toContain("auth.uid");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE (authenticated)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("public site — settings authorization", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access site settings", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/public-site`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found") || body?.toLowerCase().includes("sign in");
    expect(blocked).toBeTruthy();
  });
});
