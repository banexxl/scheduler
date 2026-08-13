import { test, expect } from "@playwright/test";

/**
 * Customer Segmentation E2E — Milestone 15.6.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("customer segments", () => {
  test("segments page renders", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/customers/segments`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/segment|customer|built-in|saved/i);
  });

  test("segments page shows built-in segments", async ({ page }) => {
    await page.goto(`/${tenantSlug}/customers/segments`, { timeout: 60000 });
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/returning|inactive|new customer|upcoming/i);
  });
});

test.describe("customer segments - authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access segments", async ({ page }) => {
    await page.goto(`/${tenantSlug}/customers/segments`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});

test.describe("customer segments - mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("segments page has no horizontal overflow", async ({ page }) => {
    await page.goto(`/${tenantSlug}/customers/segments`, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
