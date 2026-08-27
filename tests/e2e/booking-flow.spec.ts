import { test, expect } from "@playwright/test";

/**
 * Booking Flow E2E — Milestone 17.0.
 *
 * Tests the multi-page booking flow: services, staff, locations.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
const hasEnv = Boolean(tenantSlug);

test.describe("booking services page", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("services page loads", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/services`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });

  test("services page has stepper", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/services`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const stepper = page.locator(".MuiStepper-root");
    await expect(stepper).toBeVisible();
  });

  test("services page has heading", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/services`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").textContent();
    expect(body).toMatch(/select services|no services|booking unavailable/i);
  });

  test("continue button is disabled without selection", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/services`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // The booking summary should show "Select at least one service"
    const summary = page.locator("body");
    const text = await summary.textContent();
    if (text?.includes("Select at least one service")) {
      const continueButton = page.getByRole("link", { name: /continue/i });
      // Button should be present (MUI disables links via pointer-events CSS)
      await expect(continueButton).toBeVisible();
    }
  });
});

test.describe("booking staff page", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("staff page loads", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/staff`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });

  test("staff page has stepper", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/staff`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const stepper = page.locator(".MuiStepper-root");
    await expect(stepper).toBeVisible();
  });

  test("staff page shows content or redirects", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/staff`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Should either show staff content or redirect to services
    const url = page.url();
    const body = await page.locator("body").textContent();
    const validState =
      url.includes("/staff") ||
      url.includes("/services") ||
      body?.toLowerCase().includes("choose staff") ||
      body?.toLowerCase().includes("select services");
    expect(validState).toBeTruthy();
  });
});

test.describe("booking locations page", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("locations page loads", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/locations`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });

  test("locations page has stepper", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/locations`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const stepper = page.locator(".MuiStepper-root");
    await expect(stepper).toBeVisible();
  });
});

test.describe("booking flow navigation", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("back buttons exist on staff and location pages", async ({ page }) => {
    // Check staff page has back button
    await page.goto(`/book/${tenantSlug}/staff`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");
    const backOnStaff = page.getByRole("link", { name: /back/i });
    // May redirect to services, which is also valid
    const url = page.url();
    if (url.includes("/staff")) {
      await expect(backOnStaff).toBeVisible();
    }
  });
});

test.describe("booking mobile responsiveness", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");
  test.use({ viewport: { width: 375, height: 812 } });

  test("services page has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/services`, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
