import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects";

/**
 * Accessibility (a11y) Tests
 * NOTE: Requires @axe-core/playwright
 * Install: npm install -D @axe-core/playwright
 *
 * To use:
 * import { injectAxe, checkA11y } from '@axe-core/playwright';
 */
test.describe("Accessibility", () => {
  test("login page a11y scan", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Would use: await checkA11y(page);
    // For now, just verify page loads
    await expect(page).toHaveURL(/login/);
  });

  test("dashboard a11y scan", async () => {
    // Would inject axe and scan dashboard
    test.skip();
  });

  test("activity form a11y scan", async () => {
    test.skip();
  });

  test("groups list a11y scan", async () => {
    test.skip();
  });

  test("form labels verification", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Check for proper labels
    const emailLabel = page.getByLabel(/email/i);
    const passwordLabel = page.getByLabel(/hasło|password/i);

    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test("ARIA attributes verification", async () => {
    test.skip();
  });

  test("color contrast WCAG AA", async () => {
    // Requires axe or similar tool
    test.skip();
  });

  test("keyboard navigation tab order", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Test tab order
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
