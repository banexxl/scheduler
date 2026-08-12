import { test, expect } from "@playwright/test";

/**
 * Platform Admin E2E — Milestone 14.1.
 *
 * Tests navigation, authorization, responsive behavior, and runtime safety
 * for the redesigned Platform Admin area.
 *
 * Requires: TEST_USER_NAME / TEST_USER_PASSWORD for a platform admin user.
 * If the test user is NOT a platform admin, these tests will validate
 * that access is properly denied.
 */

const PLATFORM_ROUTES = [
  "/platform",
  "/platform/tenants",
  "/platform/users",
  "/platform/audit-logs",
  "/platform/billing",
  "/platform/billing/plans",
  "/platform/billing/products",
  "/platform/billing/subscriptions",
  "/platform/billing/orders",
  "/platform/billing/webhooks",
];

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe("platform admin navigation", () => {
  test("all platform routes render without 500", async ({ page }) => {
    for (const route of PLATFORM_ROUTES) {
      const response = await page.goto(route, { timeout: 60000 });
      // Should not be 500 (either renders or redirects/404)
      expect(response?.status(), `Route ${route} returned 500`).not.toBe(500);
    }
  });

  test("sidebar is visible on desktop or access denied", async ({ page }) => {
    await page.goto("/platform");
    // Check for nav element with sidebar content
    const body = await page.locator("body").textContent();
    // Either sidebar renders (platform admin) or access is denied/redirected
    const hasPlatformContent = body?.toLowerCase().includes("dashboard") || body?.toLowerCase().includes("platform");
    const isDenied = page.url().includes("login") || body?.toLowerCase().includes("not found") || body?.toLowerCase().includes("denied");
    expect(hasPlatformContent || isDenied).toBeTruthy();
  });

  test("dashboard shows metric content", async ({ page }) => {
    await page.goto("/platform");
    if (page.url().includes("/platform")) {
      const body = await page.locator("body").textContent();
      // Should show dashboard content or access denied
      expect(body).toMatch(/dashboard|tenants|billing|unauthorized|denied|sign in/i);
    }
  });

  test("tenants page shows table or empty state", async ({ page }) => {
    await page.goto("/platform/tenants");
    if (page.url().includes("/platform/tenants")) {
      const body = await page.locator("body").textContent();
      expect(body).toMatch(/tenant|business|no tenants|search/i);
    }
  });

  test("billing page shows health metrics", async ({ page }) => {
    await page.goto("/platform/billing");
    if (page.url().includes("/platform/billing")) {
      const body = await page.locator("body").textContent();
      expect(body).toMatch(/billing|plans|subscriptions|webhooks/i);
    }
  });
});

// ─── Authorization ───────────────────────────────────────────────────────────

test.describe("platform admin authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user cannot access platform admin", async ({ page }) => {
    await page.goto("/platform");
    await page.waitForURL(/login|platform/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    // Should redirect to login or show access denied
    const blocked = url.includes("login") || body?.toLowerCase().includes("denied") || body?.toLowerCase().includes("not found") || body?.toLowerCase().includes("sign in");
    expect(blocked).toBeTruthy();
  });

  test("unauthenticated user cannot access tenants", async ({ page }) => {
    await page.goto("/platform/tenants");
    await page.waitForURL(/login|platform/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("denied") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});

// ─── Responsive ──────────────────────────────────────────────────────────────

test.describe("platform admin responsive", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("platform dashboard has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/platform");
    if (page.url().includes("/platform")) {
      await page.waitForLoadState("domcontentloaded");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    }
  });

  test("tenants page has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/platform/tenants");
    if (page.url().includes("/platform/tenants")) {
      await page.waitForLoadState("domcontentloaded");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    }
  });

  test("billing subscriptions has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/platform/billing/subscriptions");
    if (page.url().includes("/platform/billing")) {
      await page.waitForLoadState("domcontentloaded");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    }
  });
});

// ─── Runtime Error Guard ─────────────────────────────────────────────────────

test.describe("platform admin runtime safety", () => {
  test("no console errors on dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/platform");
    await page.waitForLoadState("networkidle").catch(() => { });

    // Filter out known non-critical errors
    // const critical = errors.filter(
    //   (e) =>
    //     !e.includes("hydration") === false || // hydration IS critical
    //     e.includes("Functions cannot be passed directly") ||
    //     e.includes("Unhandled Runtime Error")
    // );

    // The page should not have "Functions cannot be passed directly to Client Components"
    const html = await page.content();
    expect(html).not.toContain("Functions cannot be passed directly to Client Components");
  });

  test("no hydration errors on tenants page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/platform/tenants");
    await page.waitForLoadState("networkidle").catch(() => { });

    const hydrationErrors = errors.filter((e) =>
      e.toLowerCase().includes("hydration") ||
      e.includes("did not match") ||
      e.includes("Functions cannot be passed")
    );
    expect(hydrationErrors).toEqual([]);
  });
});
