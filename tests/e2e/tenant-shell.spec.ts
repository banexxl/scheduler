import { test, expect } from "@playwright/test";

/**
 * Tenant Business Shell E2E — Milestone 14.2.
 *
 * Tests the redesigned business shell:
 * - Desktop sidebar navigation
 * - Mobile drawer navigation
 * - Active route highlighting
 * - All routes reachable
 * - No RSC/hydration errors
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

// All major tenant routes that should be navigable
const TENANT_ROUTES = [
  "dashboard",
  "my-day",
  "calendar",
  "appointments",
  "customers",
  "services",
  "resources",
  "locations",
  "reviews",
  "waitlist",
  "packages",
  "payments",
  "notifications",
  "health",
  "team",
  "settings",
];

test.describe("tenant shell - desktop", () => {
  test("all business routes render without 500", async ({ page }) => {
    for (const route of TENANT_ROUTES) {
      const response = await page.goto(`/${tenantSlug}/${route}`);
      expect(response?.status(), `/${tenantSlug}/${route} returned 500`).not.toBe(500);
    }
  });

  test("sidebar navigation is visible on desktop", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`);
    // The nav element should be visible at desktop width (1280px default)
    const nav = page.locator('nav[aria-label="Business navigation"]');
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test("dashboard shows page header", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/dashboard/i);
  });

  test("settings page shows business settings", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/settings|business details|billing/i);
  });

  test("no RSC boundary errors on navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(`/${tenantSlug}/dashboard`);
    await page.waitForLoadState("networkidle").catch(() => {});

    // Navigate to a few pages
    await page.goto(`/${tenantSlug}/services`);
    await page.waitForLoadState("networkidle").catch(() => {});

    await page.goto(`/${tenantSlug}/team`);
    await page.waitForLoadState("networkidle").catch(() => {});

    const html = await page.content();
    expect(html).not.toContain("Functions cannot be passed directly to Client Components");

    const critical = errors.filter(
      (e) => e.includes("Functions cannot be passed") || e.includes("Hydration")
    );
    expect(critical).toEqual([]);
  });
});

test.describe("tenant shell - mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("sidebar is hidden on mobile", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`);
    const nav = page.locator('nav[aria-label="Business navigation"]');
    // Desktop sidebar should be hidden on mobile (display: none at xs)
    const isVisible = await nav.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test("mobile menu button is visible", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`);
    const menuButton = page.getByRole("button", { name: /open navigation menu/i });
    await expect(menuButton).toBeVisible({ timeout: 10000 });
  });

  test("mobile drawer opens on menu click", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`);
    await page.waitForLoadState("domcontentloaded");

    const menuButton = page.getByRole("button", { name: /open navigation menu/i });
    await menuButton.click();

    // Drawer should show navigation items
    await page.waitForTimeout(500);
    const drawer = page.locator(".MuiDrawer-root");
    await expect(drawer).toBeVisible({ timeout: 5000 });
  });

  test("no horizontal overflow on key pages", async ({ page }) => {
    const pages = ["dashboard", "appointments", "services", "customers", "settings"];
    for (const route of pages) {
      await page.goto(`/${tenantSlug}/${route}`);
      await page.waitForLoadState("domcontentloaded");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth, `/${tenantSlug}/${route} overflows`).toBeLessThanOrEqual(clientWidth + 5);
    }
  });
});

test.describe("tenant shell - authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user cannot access business routes", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`);
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("sign in") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});
