import { test, expect } from "@playwright/test";

/**
 * Customer Account E2E — Milestone 13.1, Section 3.
 *
 * Tests customer-facing flows:
 * - Customer portal access
 * - Appointment management token pages
 * - Guest vs. authenticated customer behavior
 */

test.describe("customer account", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("customer login page renders", async ({ page }) => {
    await page.goto("/login");
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/sign in|email|password|log in|credentials/i);
  });

  test("customer portal redirects unauthenticated to login", async ({ page }) => {
    await page.goto("/customer");
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    expect(url.includes("login") || body?.toLowerCase().includes("sign in")).toBeTruthy();
  });

  test("appointment management with invalid token shows error", async ({ page }) => {
    await page.goto("/manage-appointment/completely-fake-token-xyz");
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/invalid|unavailable|no longer available|not found/i);
  });

  test("appointment management page does not expose internal state", async ({ page }) => {
    await page.goto("/manage-appointment/fake-token-for-security-test");
    const html = await page.content();
    // Should not reveal token state type
    expect(html).not.toContain("TOKEN_EXPIRED");
    expect(html).not.toContain("TOKEN_REVOKED");
    expect(html).not.toContain("TOKEN_NOT_FOUND");
    expect(html).not.toContain("service_role");
    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

test.describe("customer account mobile", () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 375, height: 812 },
  });

  test("customer login is usable on mobile", async ({ page }) => {
    await page.goto("/customer/login");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("appointment management is usable on mobile", async ({ page }) => {
    await page.goto("/manage-appointment/fake-mobile-test");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
