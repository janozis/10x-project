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
    await page.waitForLoadState('networkidle');
    // Wait for UI to fully render (React hydration)
    await page.waitForTimeout(500);

    // Verify page elements
    await expect(page).toHaveTitle(/logowanie|10x-project/i);
    await expect(page.getByRole('heading', { name: /zaloguj|login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zaloguj|login/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    // Wait for UI to fully render (React hydration)
    await page.waitForTimeout(500);

    // Check if button is disabled with empty fields
    const button = page.getByRole('button', { name: /zaloguj|login/i });
    await expect(button).toBeDisabled();
    
    // Try to fill and clear fields to trigger validation
    await page.getByLabel(/email/i).click();
    await page.getByLabel(/email/i).fill('a');
    await page.getByLabel(/email/i).clear();
    await page.getByLabel(/email/i).blur();
    await page.waitForTimeout(300);
    
    await page.getByLabel(/hasło|password/i).click();
    await page.getByLabel(/hasło|password/i).fill('a');
    await page.getByLabel(/hasło|password/i).clear();
    await page.getByLabel(/hasło|password/i).blur();
    await page.waitForTimeout(300);

    // Wait for validation errors - look for actual Zod messages
    await expect(page.locator('text=/podaj poprawny adres email|hasło jest wymagane/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    // Wait for UI to fully render (React hydration)
    await page.waitForTimeout(500);

    // Fill with invalid email
    await page.getByLabel(/email/i).click();
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/email/i).blur();
    await page.waitForTimeout(500);

    // Should show email validation error - actual Zod message
    await expect(page.locator('text=/podaj poprawny adres email/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    // Wait for UI to fully render (React hydration)
    await page.waitForTimeout(500);

    // Wait for LoginCard to be fully hydrated (React component with client:load)
    // The register link is inside LoginCard which needs React hydration
    await page.waitForTimeout(1000);

    // Find registration link by text and href (more reliable than test-id)
    // Use locator that finds the link inside the card (not the header)
    const registerLink = page.locator('main a[href="/auth/register"]:has-text("Zarejestruj się")');
    await expect(registerLink).toBeVisible({ timeout: 5000 });
    await registerLink.click();

    // Verify we're on registration page
    await expect(page).toHaveURL(/\/auth\/register/);
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: /rejestracja|register/i })).toBeVisible();
  });

  test('should display registration form elements', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    // Wait for UI to fully render (React hydration)
    await page.waitForTimeout(500);

    // Verify form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło|password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /zarejestruj|register/i })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    // Wait for UI to fully render (React hydration)
    await page.waitForTimeout(500);

    // Find and click forgot password link
    const forgotLink = page.getByRole('link', { name: /zapomniałeś|forgot.*password/i });
    
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/auth\/forgot-password/);
    }
  });
});

test.describe('Protected Routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Clear auth state
  
  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access a protected route (adjust URL based on your app)
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    // Wait for redirect to complete
    await page.waitForTimeout(500);

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

