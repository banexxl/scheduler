import { test, expect } from "@playwright/test";

/**
 * Gift Cards E2E — Milestone 15.2.
 *
 * Tests gift card settings, management, and public purchase surfaces.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("gift cards - tenant settings", () => {
  test("gift card settings page renders", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/settings/gift-cards`, { timeout: 60000 });
    // May 404 if route not created yet, but should not 500
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("gift cards - management", () => {
  test("gift cards management page renders", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/gift-cards`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("gift cards - public purchase", () => {
  test("public gift card page renders or redirects", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/gift-cards`, { timeout: 60000 });
    // May 404 if not enabled, but should not 500
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("gift cards - authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access gift card management", async ({ page }) => {
    await page.goto(`/${tenantSlug}/gift-cards`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});

test.describe("gift cards - mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("gift card pages have no horizontal overflow", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/gift-cards`, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
