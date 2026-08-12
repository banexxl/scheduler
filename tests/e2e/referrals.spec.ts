import { test, expect } from "@playwright/test";

/**
 * Referral Program E2E — Milestone 15.3.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("referrals - tenant settings", () => {
  test("referral settings page renders", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/settings/referrals`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("referrals - dashboard", () => {
  test("referral dashboard page renders", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/referrals`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("referrals - public booking", () => {
  test("public booking with ref param does not crash", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}?ref=TEST-CODE`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("referrals - authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access referral management", async ({ page }) => {
    await page.goto(`/${tenantSlug}/referrals`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});

test.describe("referrals - mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("referral pages have no horizontal overflow", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}?ref=TEST`, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
