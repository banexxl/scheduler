import { test, expect } from "@playwright/test";

/**
 * My Day E2E — Milestone 13.1.
 *
 * Tests staff My Day operational view.
 */

test.describe("my day", () => {
  test.skip(!process.env.TEST_BASE_URL, "TEST_BASE_URL not configured");

  test("my-day route renders for authenticated user", async ({ page }) => {
    const slug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
    await page.goto(`/${slug}/my-day`);
    const body = await page.locator("body").textContent();
    // Should show My Day content or "not linked" message
    expect(body).toMatch(/My Day|not linked|staff profile/i);
  });
});

test.describe("my day mobile", () => {
  test.skip(!process.env.TEST_BASE_URL, "TEST_BASE_URL not configured");
  test.use({ viewport: { width: 375, height: 812 } });

  test("my-day usable on mobile", async ({ page }) => {
    const slug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
    await page.goto(`/${slug}/my-day`);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
