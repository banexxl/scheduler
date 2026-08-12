import { test, expect } from "@playwright/test";

/**
 * Tenant Branding E2E — Milestone 14.4.
 *
 * Tests the branding editor and public theme application.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("branding editor", () => {
  test("branding settings page renders", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/settings/branding`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/branding|colors|preview|publish|draft/i);
  });

  test("branding page has color inputs", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/branding`, { timeout: 60000 });
    // Should have color input fields
    const colorInputs = page.locator('input[type="color"]');
    const count = await colorInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("branding page has preset selects", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/branding`, { timeout: 60000 });
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/appearance|font|radius/i);
  });

  test("branding page has save and publish buttons", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/branding`, { timeout: 60000 });
    const save = page.getByRole("button", { name: /save draft/i });
    const publish = page.getByRole("button", { name: /publish/i });
    await expect(save).toBeVisible();
    await expect(publish).toBeVisible();
  });
});

test.describe("public booking default theme", () => {
  test("public booking page renders without branding (default)", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}`, { timeout: 60000 });
    // Should render (200 or redirect) — not 500
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("branding authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access branding settings", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/branding`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});

test.describe("branding mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("branding editor has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/branding`, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
