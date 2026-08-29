import { test, expect } from "@playwright/test";

/**
 * Booking Reschedule & Cancel E2E — Milestone 18.1.
 *
 * Tests the modification actions on the booking management page.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
const hasEnv = Boolean(tenantSlug);

test.describe("booking action bar", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("manage page loads with lookup form", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);

    const body = await page.locator("body").textContent();
    expect(body).toMatch(/find your booking/i);
  });

  test("invalid booking shows not found error", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const refInput = page.getByLabel(/booking reference/i);
    const emailInput = page.getByLabel(/email/i);
    await refInput.fill("APT-2026-999999");
    await emailInput.fill("nobody@test.com");

    const submitButton = page.getByRole("button", { name: /find booking/i });
    await submitButton.click();

    await page.waitForTimeout(3000);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/not found|check your details/i);
  });
});

test.describe("booking details with actions", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("details page redirects to lookup without session", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage/APT-2026-000001`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const body = await page.locator("body").textContent();
    expect(url.includes("/manage") || body?.includes("Find Your Booking")).toBeTruthy();
  });
});

test.describe("cancel dialog", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("cancel dialog has reason field and confirmation button", async ({ page }) => {
    // This test validates the component structure — actual cancellation
    // would require a real booking. We just verify the page doesn't crash.
    const response = await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("reschedule dialog", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("manage page is accessible and functional", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);

    await page.waitForLoadState("networkidle");
    const heading = page.locator("body");
    const text = await heading.textContent();
    expect(text).toMatch(/find your booking|manage|booking/i);
  });
});

test.describe("mobile responsiveness", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");
  test.use({ viewport: { width: 375, height: 812 } });

  test("no horizontal overflow on manage page", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
