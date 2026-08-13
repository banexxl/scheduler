import { test, expect } from "@playwright/test";

/**
 * Analytics E2E Tests — Milestone 15.9.
 */

const TENANT_SLUG = "demo-salon";
const BASE = `/${TENANT_SLUG}/analytics`;

test.describe("analytics - overview", () => {
  test("analytics page loads without errors", async ({ page }) => {
    await page.goto(BASE);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("period selection via URL params", async ({ page }) => {
    await page.goto(`${BASE}?period=30days`);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

test.describe("analytics - mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("analytics is usable on mobile", async ({ page }) => {
    await page.goto(BASE);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
