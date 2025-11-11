import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects";

/**
 * E2E Test Suite for Authentication Flow using Page Object Model
 *
 * These tests verify the complete user authentication journey
 * following the AAA (Arrange, Act, Assert) pattern
 */

test.describe("Authentication Flow with POM", () => {
  test("should display login page with all elements", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();

    // Assert
    await expect(page).toHaveTitle(/logowanie|10x-project/i);
    await expect(page.getByRole("heading", { name: /zaloguj|login/i })).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act - Just check if validation happens automatically (button should be disabled)
    // With mode: "onChange", the form validates on change, so empty fields should show errors
    // But errors might only appear after trying to interact with fields

    // Alternative: Check if button is disabled when fields are empty
    await expect(loginPage.loginButton).toBeDisabled();

    // Try to fill and clear fields to trigger validation
    await loginPage.emailInput.click();
    await loginPage.emailInput.fill("a");
    await loginPage.emailInput.clear();
    await loginPage.emailInput.blur();
    await page.waitForTimeout(300);

    await loginPage.passwordInput.click();
    await loginPage.passwordInput.fill("a");
    await loginPage.passwordInput.clear();
    await loginPage.passwordInput.blur();
    await page.waitForTimeout(300);

    // Assert - Look for specific Zod validation message
    const errorText = await page.locator("text=/podaj poprawny adres email|hasło jest wymagane/i").first();
    await expect(errorText).toBeVisible({ timeout: 3000 });
  });

  test("should show error for invalid email format", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act - Fill with invalid email
    await loginPage.emailInput.click();
    await loginPage.emailInput.fill("invalid-email");
    await loginPage.emailInput.blur();
    await page.waitForTimeout(500);

    // Assert - Look for the actual Zod validation message
    const emailError = page.locator("text=/podaj poprawny adres email/i").first();
    await expect(emailError).toBeVisible({ timeout: 3000 });
  });

  test("should navigate to registration page", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.goToRegister();

    // Assert
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByRole("heading", { name: /rejestracja|register/i })).toBeVisible();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const email = process.env.E2E_USERNAME || "";
    const password = process.env.E2E_PASSWORD || "";

    // Act
    await loginPage.login(email, password);

    // Assert - Should redirect to authenticated area
    await page.waitForURL(/\/(groups|activities|dashboard)/i, { timeout: 10000 });
    await expect(page.locator("nav")).toBeVisible();
  });

  test("should use helper method for test user login", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.loginWithTestUser();

    // Assert
    await page.waitForURL(/\/(groups|activities|dashboard)/i, { timeout: 10000 });
    await expect(page.locator("nav")).toBeVisible();
  });
});

test.describe("Protected Routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Override auth state

  test("should redirect to login when accessing protected route without auth", async ({ page }) => {
    // Arrange & Act
    await page.goto("/groups");
    await page.waitForLoadState("networkidle");
    // Wait for redirect to complete
    await page.waitForTimeout(500);

    // Assert
    await expect(page).toHaveURL(/\/(auth\/login|login|join)/);
  });
});

/**
 * Visual Regression Tests
 * Uncomment to enable screenshot comparison
 */
test.describe("Visual Tests", () => {
  test.skip("login page visual snapshot", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();

    // Assert
    await expect(page).toHaveScreenshot("login-page.png");
  });
});
