/* eslint-disable no-console */
import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, ".auth", "user.json");

/**
 * Global setup: Authenticate once before all tests
 * This saves the authenticated state to be reused across all tests
 */
setup("authenticate", async ({ page }) => {
  // Arrange
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
  }

  console.log(`\n🔐 Authenticating as: ${username}`);

  // Act - Navigate to login page
  await page.goto("/auth/login", { waitUntil: "networkidle" });
  console.log("✓ Navigated to login page");

  // Wait for the page to be fully loaded and stable
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000); // Extra wait to ensure React hydration is complete
  console.log("✓ Page fully loaded");

  // Fill in login form - use pressSequentially to simulate real typing
  const emailInput = page.getByLabel(/email/i);

  // Wait for the input to be visible and ready
  await emailInput.waitFor({ state: "visible" });
  await emailInput.click();
  await emailInput.pressSequentially(username, { delay: 50 });
  console.log("✓ Filled email field");

  // Tab to next field to trigger validation
  await emailInput.press("Tab");

  // Password field - use input selector since type="password" is not a textbox role
  const passwordInput = page.locator('input[type="password"][name="password"]');
  await passwordInput.click();
  await passwordInput.pressSequentially(password, { delay: 50 });
  console.log("✓ Filled password field");

  // Wait for the button to become enabled (form validation to pass)
  const submitButton = page.getByRole("button", { name: /zaloguj|login|sign in/i });
  await submitButton.waitFor({ state: "visible" });

  // Check if button is enabled
  const isDisabled = await submitButton.getAttribute("disabled");
  const ariaDisabled = await submitButton.getAttribute("aria-disabled");
  console.log(`🔍 Button state - disabled: ${isDisabled}, aria-disabled: ${ariaDisabled}`);

  // Wait a bit for React state to update
  await page.waitForTimeout(500);

  // Check again after wait
  const isDisabledAfter = await submitButton.getAttribute("disabled");
  console.log(`🔍 Button state after wait - disabled: ${isDisabledAfter}`);

  // Now click the submit button
  console.log("🖱️  Attempting to click submit button...");
  await submitButton.click({ force: true });

  console.log("⏳ Waiting for redirect after login...");

  // Assert - Wait for successful login (redirect to authenticated page)
  try {
    await page.waitForURL(/\/(groups|activities|dashboard)/i, { timeout: 10000 });
    console.log("✓ Redirected to:", page.url());
  } catch (error) {
    console.log("❌ No redirect happened. Current URL:", page.url());
    throw error;
  }

  // Verify we're actually logged in
  await expect(page.locator("nav")).toBeVisible();

  console.log("✅ Authentication successful!");

  // Save signed-in state to reuse in other tests
  await page.context().storageState({ path: authFile });
});
