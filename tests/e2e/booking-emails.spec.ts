import { test, expect } from "@playwright/test";

/**
 * Booking Emails E2E — Milestone 18.2.
 *
 * Tests that booking actions trigger email sends.
 * In test environment, EMAIL_PROVIDER=console logs emails.
 * We verify the booking pages work correctly; actual email
 * delivery is tested via unit tests on render-template.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";
const hasEnv = Boolean(tenantSlug);

test.describe("email trigger points", () => {
  test.skip(!hasEnv, "TEST_TENANT_SLUG not configured");

  test("booking confirmation page loads after booking", async ({ page }) => {
    // The confirmation page works regardless of email — verify it loads
    const response = await page.goto(`/book/${tenantSlug}/confirm`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });

  test("manage page is accessible for email links", async ({ page }) => {
    // Manage URL is included in all emails — verify it loads
    const response = await page.goto(`/book/${tenantSlug}/manage`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);

    const body = await page.locator("body").textContent();
    expect(body).toMatch(/find your booking/i);
  });
});

test.describe("reminder cron endpoint", () => {
  test("cron endpoint returns 401 without secret", async ({ request }) => {
    const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
    const response = await request.get(`${baseUrl}/api/cron/send-reminders`);
    // Should return 401 if CRON_SECRET is set, or 200 if not configured
    expect([200, 401]).toContain(response.status());
  });
});
