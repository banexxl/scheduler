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

    const deleteButton = page.getByRole("button", { name: /delete business/i });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for the "Delete Permanently" button to appear (confirms dialog is open)
    const confirmButton = page.getByRole("button", { name: /delete permanently/i });
    await expect(confirmButton).toBeVisible({ timeout: 15000 });

    // Dialog content should have deletion-related info
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/delete|cancel|data|members|appointments/i);
  });

  test("delete button is disabled without confirmation", async ({ page }) => {
    await page.goto(`/${tenantSlug}/settings`);
    await page.waitForLoadState("networkidle");

    const deleteButton = page.getByRole("button", { name: /delete business/i });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for dialog — the Cancel button is always enabled and visible
    const cancelButton = page.getByRole("button", { name: /^cancel$/i });
    await expect(cancelButton).toBeVisible({ timeout: 15000 });

    // The "Delete Permanently" button should exist and be disabled
    const confirmButton = page.locator("button:has-text('Delete Permanently')");
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await expect(confirmButton).toBeDisabled();
  });
});
