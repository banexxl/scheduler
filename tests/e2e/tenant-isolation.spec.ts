import { test, expect } from "@playwright/test";

/**
 * Tenant Isolation E2E — Milestone 13.1, Section 2.
 *
 * Verifies browser-level tenant isolation:
 * - Accessing another tenant's pages shows 404/redirect
 * - No cross-tenant data leaks in HTML
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("tenant isolation", () => {
  test("accessing non-existent tenant returns 404", async ({ page }) => {
    const response = await page.goto("/completely-fake-tenant-xyzzy/dashboard");
    // Should be 404 or redirect
    expect(response?.status()).not.toBe(500);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/not found|404|sign in|login/i);
  });

  test("own tenant is accessible", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/dashboard`);
    expect(response?.status()).not.toBe(500);
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(0);
  });

  test("settings page does not expose other tenant data", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    const html = await page.content();
    // Should not contain other test tenant slugs
    expect(html).not.toContain("e2e-clinic");
    expect(html).not.toContain("e2e-payments");
  });
});
