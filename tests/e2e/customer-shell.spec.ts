import { test, expect } from "@playwright/test";

/**
 * Customer App Shell E2E — Milestone 14.3.
 *
 * Tests the redesigned customer shell, navigation, and route rendering.
 */

const CUSTOMER_ROUTES = [
  "/customer",
  "/customer/appointments",
  "/customer/businesses",
  "/customer/rewards",
  "/customer/payments",
  "/customer/communications",
  "/customer/account",
];

test.describe("customer shell - navigation", () => {
  test("all customer routes render without 500", async ({ page }) => {
    for (const route of CUSTOMER_ROUTES) {
      const response = await page.goto(route, { timeout: 60000 });
      // Should not be 500 — may redirect to login if not authenticated as customer
      const status = response?.status() ?? 0;
      expect(status, `${route} returned 500`).not.toBe(500);
    }
  });

  test("customer dashboard shows greeting or login", async ({ page }) => {
    await page.goto("/customer", { timeout: 60000 });
    const body = await page.locator("body").textContent();
    // Either shows customer content or redirects to login
    expect(body).toMatch(/hello|welcome|sign in|login|upcoming|businesses/i);
  });

  test("appointments page shows tabs or login", async ({ page }) => {
    await page.goto("/customer/appointments", { timeout: 60000 });
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/upcoming|past|cancelled|appointments|sign in|login/i);
  });

  test("businesses page shows content or login", async ({ page }) => {
    const response = await page.goto("/customer/businesses", { timeout: 60000 });
    expect(response?.status()).not.toBe(500);
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(0);
  });

  test("account page shows profile or login", async ({ page }) => {
    await page.goto("/customer/account", { timeout: 60000 });
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/account|profile|email|name|sign in|login/i);
  });
});

test.describe("customer shell - mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("no horizontal overflow on customer pages", async ({ page }) => {
    for (const route of ["/customer", "/customer/appointments", "/customer/businesses"]) {
      await page.goto(route, { timeout: 60000 });
      await page.waitForLoadState("domcontentloaded");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth, `${route} overflows`).toBeLessThanOrEqual(clientWidth + 5);
    }
  });
});

test.describe("customer shell - authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user is redirected from customer routes", async ({ page }) => {
    await page.goto("/customer", { timeout: 60000 });
    await page.waitForURL(/login|customer/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("sign in");
    expect(blocked).toBeTruthy();
  });
});

test.describe("customer shell - runtime safety", () => {
  test("no RSC boundary errors on customer pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/customer", { timeout: 60000 });
    await page.waitForLoadState("networkidle").catch(() => { });

    const html = await page.content();
    expect(html).not.toContain("Functions cannot be passed directly to Client Components");

    const critical = errors.filter(
      (e) => e.includes("Functions cannot be passed") || e.includes("Hydration")
    );
    expect(critical).toEqual([]);
  });
});
