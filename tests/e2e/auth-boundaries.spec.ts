import { test, expect } from "@playwright/test";

/**
 * Authentication Boundary E2E — Milestone 10.5.
 *
 * Verifies that unauthenticated users are redirected from protected routes.
 */

test.describe("unauthenticated access", () => {
  test("customer route redirects to login", async ({ page }) => {
    await page.goto("/customer", { waitUntil: "commit" });
    const url = page.url();
    expect(url).toMatch(/login/);
  });

  test("business dashboard redirects to login", async ({ page }) => {
    await page.goto("/any-tenant/dashboard", { waitUntil: "commit" });
    const url = page.url();
    const isLoginRedirect = url.includes("login");
    const is404 = await page.locator("body").textContent().then(t => t?.includes("not found"));
    expect(isLoginRedirect || is404).toBeTruthy();
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
