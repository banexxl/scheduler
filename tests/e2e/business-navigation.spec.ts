import { test, expect } from "@playwright/test";

/**
 * Business Navigation Smoke — Milestone 13.1.
 * @smoke
 *
 * Verifies all primary BusinessShell destinations render without error.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
const hasEnv = Boolean(process.env.TEST_BASE_URL);

test.describe("business navigation smoke", () => {
  test.skip(!hasEnv, "TEST_BASE_URL not configured");

  const routes = [
    "dashboard",
    "my-day",
    "calendar",
    "appointments",
    "customers",
    "services",
    "resources",
    "locations",
    "packages",
    "reviews",
    "waitlist",
    "payments",
    "notifications",
    "health",
    "team",
    "settings",
  ];

  for (const route of routes) {
    test(`/${tenantSlug}/${route} renders without error`, async ({ page }) => {
      const response = await page.goto(`/${tenantSlug}/${route}`);
      // Should not be 500
      expect(response?.status()).not.toBe(500);
      // Should have some content (not completely blank)
      const body = await page.locator("body").textContent();
      expect(body?.length).toBeGreaterThan(0);
    });
  }
});
