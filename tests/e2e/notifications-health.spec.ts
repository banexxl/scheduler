import { test, expect } from "@playwright/test";

/**
 * Notifications & Health E2E — Milestone 13.1.
 * @smoke
 */

test.describe("notifications and health", () => {
  test.skip(!process.env.TEST_BASE_URL, "TEST_BASE_URL not configured");

  const slug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

  test("notifications route renders", async ({ page }) => {
    await page.goto(`/${slug}/notifications`);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/Notification|caught up|Sign In|login/i);
  });

  test("health route renders", async ({ page }) => {
    await page.goto(`/${slug}/health`);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/Setup Health|ready|attention|blocked|Sign In|login/i);
  });

  test("health endpoint returns 200", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response?.status()).toBe(200);
  });
});
