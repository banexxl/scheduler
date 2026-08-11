import { test, expect } from "@playwright/test";

/**
 * Authentication Boundary E2E — Milestone 10.5.
 *
 * Verifies that unauthenticated users are redirected from protected routes.
 * These tests run WITHOUT stored auth state.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("unauthenticated access", () => {
  test("customer route redirects to login", async ({ page }) => {
    await page.goto("/customer");
    await page.waitForURL(/login|register/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    const isAuthPage = url.includes("login") || url.includes("register") || body?.toLowerCase().includes("sign in");
    expect(isAuthPage).toBeTruthy();
  });

  test("business dashboard redirects to login", async ({ page }) => {
    await page.goto("/any-tenant/dashboard");
    await page.waitForURL(/login|register/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    const isAuthPage = url.includes("login") || url.includes("register");
    const is404 = body?.toLowerCase().includes("not found") || body?.toLowerCase().includes("404");
    expect(isAuthPage || is404).toBeTruthy();
  });
});

test.describe("public routes accessible without auth", () => {
  test("health endpoint accessible", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response?.status()).toBe(200);
  });

  test("manage-appointment accessible (shows unavailable for bad token)", async ({ page }) => {
    await page.goto("/manage-appointment/test-invalid-token");
    const body = await page.locator("body").textContent();
    expect(body).toContain("invalid");
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("booking page loads without horizontal overflow", async ({ page }) => {
    await page.goto("/book/any-slug");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
