import { test, expect } from "@playwright/test";

/**
 * Tenant Deletion E2E — Milestone 13.2.
 *
 * Tests the deletion UI on settings page:
 * - Danger zone visible to owner
 * - Dialog opens with preview
 * - Confirmation required
 *
 * NOTE: Does NOT actually delete the test tenant.
 */

const tenantSlug = process.env.TEST_TENANT_SLUG ?? "e2e-salon";

test.describe("tenant deletion UI", () => {
  test("settings page shows danger zone for owner", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    await page.waitForLoadState("domcontentloaded");

    const body = await page.locator("body").textContent();
    expect(body).toMatch(/danger zone/i);
    expect(body).toMatch(/delete business/i);
  });

  test("clicking delete opens confirmation dialog", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    await page.waitForLoadState("networkidle");

    // Wait for the page to fully hydrate — the delete button needs React handlers attached
    const deleteButton = page.locator("button:has-text('Delete Business')");
    await expect(deleteButton).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000); // Extra hydration buffer
    await deleteButton.click();

    // Wait for dialog content text (more reliable than button role matching)
    const dialogText = page.locator("text=Data that will be permanently deleted");
    await expect(dialogText).toBeVisible({ timeout: 15000 });

    const body = await page.locator("body").textContent();
    expect(body).toMatch(/delete|cancel|data|members|appointments/i);
  });

  test("delete button is disabled without confirmation", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    await page.waitForLoadState("networkidle");

    const deleteButton = page.locator("button:has-text('Delete Business')");
    await expect(deleteButton).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await deleteButton.click();

    // Wait for dialog content
    const dialogText = page.locator("text=Data that will be permanently deleted");
    await expect(dialogText).toBeVisible({ timeout: 15000 });

    // The confirm button should be disabled (located by text, not role, since disabled buttons may be skipped)
    const confirmButton = page.locator("button:has-text('Delete Permanently')");
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeDisabled();
  });
});
