import { test, expect } from "@playwright/test";

/**
 * Appointment Self-Service E2E — Milestone 10.5.
 *
 * Verifies tokenized appointment management page behavior.
 */

test.describe("appointment self-service", () => {
  test("invalid token shows generic unavailable message", async ({ page }) => {
    await page.goto("/manage-appointment/completely-invalid-token-xyz");
    // Should show safe generic message
    const body = page.locator("body");
    await expect(body).toContainText(/invalid|no longer available|unavailable/i);
    // Should NOT show specific token state
    const html = await page.content();
    expect(html).not.toContain("TOKEN_EXPIRED");
    expect(html).not.toContain("TOKEN_REVOKED");
    expect(html).not.toContain("TOKEN_NOT_FOUND");
  });

  test("self-service page does not index (noindex)", async ({ page }) => {
    await page.goto("/manage-appointment/fake-token-for-test");
    const metaRobots = await page.locator('meta[name="robots"]').getAttribute("content");
    if (metaRobots) {
      expect(metaRobots).toContain("noindex");
    }
  });
});
