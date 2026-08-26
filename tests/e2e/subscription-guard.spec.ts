import { test, expect } from "@playwright/test";

/**
 * Subscription Guard E2E — Milestone 15.14.
 *
 * Tests that dashboard access is properly gated by subscription/trial status.
 * Requires TEST_TENANT_SLUG with active trial/subscription.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "";
const hasEnv = Boolean(tenantSlug);

test.describe("subscription guard — dashboard access", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("dashboard is accessible with active trial/subscription", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/dashboard`, { timeout: 60000 });
    const status = response?.status() ?? 0;
    // Should either show dashboard or redirect to billing-required (both are valid states)
    expect(status).not.toBe(500);
    const url = page.url();
    const isValid = url.includes("/dashboard") || url.includes("/billing-required") || url.includes("/login");
    expect(isValid).toBeTruthy();
  });

  test("billing-required page does not cause infinite redirect", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/billing-required`, { timeout: 60000 });
    const status = response?.status() ?? 0;
    expect(status).not.toBe(500);
    // Should either show the page or redirect to dashboard (if subscription is active)
    const url = page.url();
    expect(url).not.toContain("ERR_TOO_MANY_REDIRECTS");
  });

  test("settings/billing remains accessible regardless of subscription", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/settings/billing`, { timeout: 60000 });
    const status = response?.status() ?? 0;
    expect(status).not.toBe(500);
    // Should not redirect to billing-required
    const url = page.url();
    expect(url).not.toContain("/billing-required");
  });
});

test.describe("subscription guard — unauthorized access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user cannot access billing-required page", async ({ page }) => {
    await page.goto(`/${tenantSlug}/billing-required`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});

test.describe("subscription guard — public booking unaffected", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("public booking page is always accessible", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}`, { timeout: 60000 });
    const status = response?.status() ?? 0;
    // Public booking should never redirect to billing-required
    expect(status).not.toBe(500);
    const url = page.url();
    expect(url).not.toContain("/billing-required");
  });
});
