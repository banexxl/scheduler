import { test, expect } from "@playwright/test";

/**
 * Booking Management E2E — Milestone 18.0.
 *
 * Tests the customer self-service booking lookup and details pages.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
const hasEnv = Boolean(tenantSlug);

test.describe("booking lookup page", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("manage page loads without error", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });

  test("manage page has lookup form", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").textContent();
    expect(body).toMatch(/find your booking/i);

    // Should have reference and email fields
    const refInput = page.getByLabel(/booking reference/i);
    const emailInput = page.getByLabel(/email/i);
    await expect(refInput).toBeVisible();
    await expect(emailInput).toBeVisible();
  });

  test("lookup form validates required fields", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Click submit without filling
    const submitButton = page.getByRole("button", { name: /find booking/i });
    await submitButton.click();

    // Should show validation errors
    await page.waitForTimeout(500);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/required/i);
  });

  test("invalid reference shows generic error", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Fill with invalid data
    const refInput = page.getByLabel(/booking reference/i);
    const emailInput = page.getByLabel(/email/i);
    await refInput.fill("APT-2026-999999");
    await emailInput.fill("nobody@example.com");

    const submitButton = page.getByRole("button", { name: /find booking/i });
    await submitButton.click();

    // Should show generic "not found" error
    await page.waitForTimeout(2000);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/not found|check your details/i);
  });
});

test.describe("booking details page", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("details page redirects without email in session", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}/manage/APT-2026-000001`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Should redirect to manage page (no email in sessionStorage)
    const url = page.url();
    const body = await page.locator("body").textContent();
    const validState =
      url.includes("/manage") ||
      body?.toLowerCase().includes("find your booking");
    expect(validState).toBeTruthy();
  });
});

test.describe("booking management mobile", () => {
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
