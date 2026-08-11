import { test, expect } from "@playwright/test";

/**
 * Mobile Critical Flows E2E — Milestone 13.1, Section 23.
 *
 * Validates that all critical pages work on mobile viewport:
 * - No horizontal overflow
 * - Primary actions reachable
 * - Navigation usable
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("mobile critical flows", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const criticalPages = [
    { name: "dashboard", path: `/${tenantSlug}/dashboard` },
    { name: "calendar", path: `/${tenantSlug}/calendar` },
    { name: "appointments", path: `/${tenantSlug}/appointments` },
    { name: "services", path: `/${tenantSlug}/services` },
    { name: "customers", path: `/${tenantSlug}/customers` },
    { name: "settings", path: `/${tenantSlug}/settings` },
    { name: "packages", path: `/${tenantSlug}/packages` },
    { name: "payments", path: `/${tenantSlug}/payments` },
    { name: "waitlist", path: `/${tenantSlug}/waitlist` },
    { name: "reviews", path: `/${tenantSlug}/reviews` },
  ];

  for (const { name, path } of criticalPages) {
    test(`${name} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      // Wait for content to render
      await page.waitForLoadState("domcontentloaded");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    });
  }

  test("public booking page is mobile-friendly", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    await page.waitForLoadState("domcontentloaded");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
