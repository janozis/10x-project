import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects';

/**
 * E2E Test Suite for Authentication Flow using Page Object Model
 * 
 * These tests verify the complete user authentication journey
 * following the AAA (Arrange, Act, Assert) pattern
 */

test.describe('Authentication Flow with POM', () => {
  test('should display login page with all elements', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();

    // Assert
    await expect(page).toHaveTitle(/10x-project/i);
    await expect(page.getByRole('heading', { name: /zaloguj|login/i })).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.loginButton.click();

    // Assert - Wait for validation errors
    const errorText = await page.locator('text=/wymagane|required/i').first();
    await expect(errorText).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.login('invalid-email', 'password123');

    // Assert
    const emailError = page.locator('text=/nieprawidłowy|invalid.*email/i').first();
    await expect(emailError).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.goToRegister();

    // Assert
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByRole('heading', { name: /rejestracja|register/i })).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const email = process.env.E2E_USERNAME!;
    const password = process.env.E2E_PASSWORD!;

    // Act
    await loginPage.login(email, password);

    // Assert - Should redirect to authenticated area
    await page.waitForURL(/\/(groups|activities|dashboard)/i, { timeout: 10000 });
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should use helper method for test user login', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.loginWithTestUser();

    // Assert
    await page.waitForURL(/\/(groups|activities|dashboard)/i, { timeout: 10000 });
    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Override auth state

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Arrange & Act
    await page.goto('/groups');

    // Assert
    await expect(page).toHaveURL(/\/(auth\/login|login|join)/);
  });
});

/**
 * Visual Regression Tests
 * Uncomment to enable screenshot comparison
 */
test.describe('Visual Tests', () => {
  test.skip('login page visual snapshot', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();

    // Assert
    await expect(page).toHaveScreenshot('login-page.png');
  });
});

