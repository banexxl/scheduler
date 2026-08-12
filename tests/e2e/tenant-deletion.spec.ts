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

    // Click the delete button
    const deleteButton = page.getByRole("button", { name: /delete business/i });
    await deleteButton.click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Should show delete text
    const dialogContent = await dialog.textContent();
    expect(dialogContent).toMatch(/permanently delete|cannot be undone/i);
  });

  test("delete button is disabled without confirmation", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    await page.waitForLoadState("networkidle");

    const deleteButton = page.getByRole("button", { name: /delete business/i });
    await deleteButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // The "Delete Permanently" button should be disabled
    const confirmButton = dialog.getByRole("button", { name: /delete permanently/i });
    await expect(confirmButton).toBeDisabled();
  });
});
