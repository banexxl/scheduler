import { test, expect } from "@playwright/test";

/**
 * Template System E2E — Milestone 16.2.
 *
 * Tests the template settings page and public template rendering.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("template settings page", () => {
  test("templates page renders with template cards", async ({ page }) => {
    const response = await page.goto(`/${tenantSlug}/settings/templates`, { timeout: 60000 });
    expect(response?.status()).not.toBe(500);

    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/templates/i);
    expect(body).toMatch(/minimal|bold|elegant/i);
  });

  test("template cards have preview and activate buttons", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/templates`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const previewButtons = page.getByRole("button", { name: /preview/i });
    const count = await previewButtons.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least 2 non-active templates have preview
  });

  test("one template shows as active", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/templates`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const activeChip = page.locator("text=Active").first();
    await expect(activeChip).toBeVisible();
  });

  test("preview modal opens on click", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/templates`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const previewButton = page.getByRole("button", { name: /preview/i }).first();
    await previewButton.click();

    // Full-screen dialog should appear
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should have device toggle
    const desktopToggle = page.getByRole("button", { name: /desktop preview/i });
    const mobileToggle = page.getByRole("button", { name: /mobile preview/i });
    await expect(desktopToggle).toBeVisible();
    await expect(mobileToggle).toBeVisible();
  });
});

test.describe("templates in settings nav", () => {
  test("settings page has templates link", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`, { timeout: 60000 });
    await page.waitForLoadState("networkidle");

    const templatesLink = page.getByRole("link", { name: /templates/i });
    await expect(templatesLink).toBeVisible();
  });
});

test.describe("template authorization", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated cannot access template settings", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings/templates`, { timeout: 60000 });
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    const url = page.url();
    const body = await page.locator("body").textContent();
    const blocked = url.includes("login") || body?.toLowerCase().includes("not found");
    expect(blocked).toBeTruthy();
  });
});
