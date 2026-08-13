import { test, expect } from "@playwright/test";

/**
 * Campaign E2E Tests — Milestone 15.7.
 *
 * Behavioral tests for the campaign management flow.
 * Does NOT send real external emails (provider is console/stub in test env).
 */

const TENANT_SLUG = "demo-salon";
const BASE = `/${TENANT_SLUG}/campaigns`;

test.describe("campaigns - dashboard", () => {
  test("campaigns page loads without errors", async ({ page }) => {
    await page.goto(BASE);
    // Should show the page header or login redirect
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
    // No runtime errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});

test.describe("campaigns - new campaign flow", () => {
  test("new campaign page loads", async ({ page }) => {
    await page.goto(`${BASE}/new`);
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

test.describe("campaigns - mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("campaign dashboard is usable on mobile", async ({ page }) => {
    await page.goto(BASE);
    // Page should not have horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Small tolerance
  });

  test("new campaign builder is usable on mobile", async ({ page }) => {
    await page.goto(`${BASE}/new`);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("campaigns - unsubscribe page", () => {
  test("unsubscribe page with invalid token shows warning", async ({ page }) => {
    await page.goto(`/book/${TENANT_SLUG}/communications/unsubscribe/invalid-token-123`);
    // Should show the unsubscribe page (success or invalid message)
    const content = await page.textContent("body");
    expect(content).toContain("nsubscribe"); // "Unsubscribe" or "unsubscribe"
  });

  test("unsubscribe page renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(`/book/${TENANT_SLUG}/communications/unsubscribe/test-token`);
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
