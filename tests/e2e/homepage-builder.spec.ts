import { test, expect } from "@playwright/test";

/**
 * Homepage Builder E2E — Milestone 16.4.
 *
 * Tests the homepage builder dashboard page and public rendering.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("homepage builder page", () => {
  test("homepage builder renders with accordion sections", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/site/homepage`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);

    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/homepage/i);
    expect(body).toMatch(/hero/i);
    expect(body).toMatch(/about/i);
    expect(body).toMatch(/gallery/i);
    expect(body).toMatch(/testimonials/i);
    expect(body).toMatch(/section order/i);
  });

  test("hero editor has form fields", async ({ page }) => {
    await page.goto(`/${tenantSlug}/site/homepage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Hero accordion should be expanded by default
    const headlineInput = page.getByRole("textbox", { name: "Headline", exact: true });
    await expect(headlineInput).toBeVisible();

    const ctaLabelInput = page.getByLabel(/cta button label/i);
    await expect(ctaLabelInput).toBeVisible();

    const ctaDestination = page.getByLabel(/cta destination/i);
    await expect(ctaDestination).toBeVisible();
  });

  test("hero editor save button is disabled when clean", async ({ page }) => {
    await page.goto(`/${tenantSlug}/site/homepage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const saveButton = page.getByRole("button", { name: /save hero/i });
    await expect(saveButton).toBeDisabled();
  });

  test("section order shows visibility toggles", async ({ page }) => {
    await page.goto(`/${tenantSlug}/site/homepage`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Expand the Section Order accordion
    const sectionOrderHeader = page.getByText("Section Order & Visibility");
    await sectionOrderHeader.click();

    // Should have toggle switches
    const switches = page.locator("[role='switch']");
    const count = await switches.count();
    expect(count).toBeGreaterThanOrEqual(5); // At least 5 section toggles
  });
});

test.describe("homepage builder sidebar nav", () => {
  test("dashboard sidebar has Homepage link", async ({ page }) => {
    await page.goto(`/${tenantSlug}/dashboard`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // On mobile, the sidebar is a drawer — open it first
    const hamburger = page.getByRole("button", { name: /open navigation/i });
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(500);
    }

    const homepageLink = page.getByRole("link", { name: /homepage/i });
    await expect(homepageLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe("public homepage sections", () => {
  test("public page renders dynamic content sections", async ({ page }) => {
    const response = await page.goto(`/book/${tenantSlug}`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);

    await page.waitForLoadState("networkidle");

    // Page should have content (hero is rendered by shell)
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("booking wizard renders on public page", async ({ page }) => {
    await page.goto(`/book/${tenantSlug}`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    // Should have a booking section or booking-related content
    const body = await page.locator("body").textContent();
    const hasBooking = body?.toLowerCase().includes("book") || body?.toLowerCase().includes("appointment");
    expect(hasBooking).toBeTruthy();
  });
});

test.describe("homepage builder authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access homepage builder", async ({ page }) => {
    await page.goto(`/${tenantSlug}/site/homepage`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => { });
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});
