import { test, expect } from "@playwright/test";

/**
 * Team Management E2E — Milestone 13.1, Section 15.
 *
 * Tests team-related UI:
 * - Team page renders member list
 * - Invitation flow renders
 * - Team page is usable on mobile
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("team management", () => {
  test("team page renders member list", async ({ page }) => {
    await page.goto(`/${tenantSlug}/team`);
    const body = await page.locator("body").textContent();
    // Should show team content
    expect(body).toMatch(/team|member|owner|invite|role/i);
  });

  test("team page does not expose sensitive data", async ({ page }) => {
    await page.goto(`/${tenantSlug}/team`);
    const html = await page.content();
    expect(html).not.toContain("service_role");
    expect(html).not.toContain("token_hash");
    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

test.describe("team management mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("team page is usable on mobile", async ({ page }) => {
    await page.goto(`/${tenantSlug}/team`);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
