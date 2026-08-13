import { test, expect } from "@playwright/test";

/**
 * Automation E2E Tests — Milestone 15.8.
 *
 * Behavioral tests for the automation management flow.
 * Does NOT send real external emails (provider is console/stub in test env).
 */

const TENANT_SLUG = "demo-salon";
const BASE = `/${TENANT_SLUG}/automations`;

test.describe("automations - dashboard", () => {
  test("automations page loads without errors", async ({ page }) => {
    await page.goto(BASE);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});

test.describe("automations - new automation flow", () => {
  test("new automation page loads", async ({ page }) => {
    await page.goto(`${BASE}/new`);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

test.describe("automations - mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("automation dashboard is usable on mobile", async ({ page }) => {
    await page.goto(BASE);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("new automation builder is usable on mobile", async ({ page }) => {
    await page.goto(`${BASE}/new`);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
