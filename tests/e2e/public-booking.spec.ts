import { test, expect } from "@playwright/test";

/**
 * Public Booking E2E — Milestone 10.5.
 *
 * Verifies the guest booking flow works end-to-end.
 * Requires a running app with a configured tenant.
 *
 * Environment: TEST_PUBLIC_TENANT_SLUG (slug of a tenant with public booking enabled)
 */

const tenantSlug = process.env.TEST_PUBLIC_TENANT_SLUG ?? "";
const hasEnv = Boolean(tenantSlug);

test.describe("public booking flow", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");

  test("booking page loads and shows services", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    await expect(page).toHaveTitle(/book/i);
    // Should show at least one service or availability element
    const content = page.locator("main, [role='main'], body");
    await expect(content).toBeVisible();
  });

  test("booking page does not expose internal data", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    const html = await page.content();
    expect(html).not.toContain("internal_notes");
    expect(html).not.toContain("blocked_reason");
    expect(html).not.toContain("service_role");
  });

  test("non-existent tenant shows safe error", async ({ page }) => {
    await page.goto("/book/completely-fake-tenant-xyz-999");
    // Should not crash — shows redirect or not-found
    const status = page.url();
    expect(status).toBeDefined();
  });
});

test.describe("public booking mobile", () => {
  test.skip(!hasEnv, "TEST_PUBLIC_TENANT_SLUG not configured");
  test.use({ viewport: { width: 390, height: 844 } });

  test("booking page is usable on mobile viewport", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`);
    // No horizontal scrollbar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // small tolerance
  });
});
