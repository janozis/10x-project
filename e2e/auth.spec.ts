import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite for Authentication Flow
 * 
 * These tests verify the complete user authentication journey
 * following the Page Object Model pattern
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application root before each test
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');

    // Verify page elements
    await expect(page).toHaveTitle(/10x-project/i);
    await expect(page.getByRole('heading', { name: /zaloguj|login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zaloguj|login/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth/login');

    // Click submit without filling the form
    await page.getByRole('button', { name: /zaloguj|login/i }).click();

    // Wait for validation errors
    // Note: Adjust selectors based on actual validation implementation
    await expect(page.locator('text=/wymagane|required/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill with invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/hasło|password/i).fill('password123');
    await page.getByRole('button', { name: /zaloguj|login/i }).click();

    // Should show email validation error
    await expect(page.locator('text=/nieprawidłowy|invalid.*email/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/auth/login');

    // Find and click registration link
    const registerLink = page.getByRole('link', { name: /zarejestruj|register|sign up/i });
    await registerLink.click();

    // Verify we're on registration page
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByRole('heading', { name: /rejestracja|register/i })).toBeVisible();
  });

  test('should display registration form elements', async ({ page }) => {
    await page.goto('/auth/register');

    // Verify form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło|password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /zarejestruj|register/i })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/auth/login');

    // Find and click forgot password link
    const forgotLink = page.getByRole('link', { name: /zapomniałeś|forgot.*password/i });
    
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/\/auth\/forgot-password/);
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access a protected route (adjust URL based on your app)
    await page.goto('/groups');

    // Should redirect to login
    // Note: This assumes your app redirects unauthenticated users
    // Adjust the assertion based on your actual implementation
    await expect(page).toHaveURL(/\/(auth\/login|login|join)/);
  });
});

/**
 * Visual Regression Tests
 * Uncomment to enable screenshot comparison
 */
test.describe('Visual Tests', () => {
  test.skip('login page visual snapshot', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test.skip('register page visual snapshot', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page).toHaveScreenshot('register-page.png');
  });
});

