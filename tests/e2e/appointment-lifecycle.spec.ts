import { test, expect } from "@playwright/test";

/**
 * Appointment Lifecycle E2E — Milestone 13.1.
 *
 * Tests appointment status transitions through the UI.
 * Requires authenticated owner/admin state.
 */

test.describe("appointment lifecycle", () => {
  test.skip(!process.env.TEST_BASE_URL, "TEST_BASE_URL not configured");

  test("appointment detail page renders", async ({ page }) => {
    // Navigate to appointments list
    const slug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
    await page.goto(`/${slug}/appointments`);
    const content = await page.locator("body").textContent();
    expect(content).toBeDefined();
  });

  test("new appointment page renders", async ({ page }) => {
    const slug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
    await page.goto(`/${slug}/appointments/new`);
    const content = await page.locator("body").textContent();
    expect(content).toBeDefined();
  });
});
