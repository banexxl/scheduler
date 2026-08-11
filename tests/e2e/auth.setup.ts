import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../../.playwright-auth/user.json");

/**
 * Playwright auth setup — logs in once and stores session state.
 * Other tests reuse the stored auth state so they don't have to log in each time.
 */
setup("authenticate", async ({ page }) => {
  const username = process.env.TEST_USER_NAME;
  const password = process.env.TEST_USER_PASSWORD;

  if (!username || !password) {
    throw new Error("TEST_USER_NAME and TEST_USER_PASSWORD must be set in .env");
  }

  // Navigate to login page
  await page.goto("/login");

  // Fill credentials
  await page.getByLabel(/email/i).fill(username);
  await page.getByLabel(/password/i).fill(password);

  // Submit
  await page.getByRole("button", { name: /sign in|log in|submit/i }).click();

  // Wait for redirect to dashboard or any authenticated page
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Verify we're authenticated
  expect(page.url()).not.toContain("/login");

  // Save auth state
  await page.context().storageState({ path: authFile });
});
