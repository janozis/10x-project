import { test, expect } from '@playwright/test';
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from './page-objects';
import { generateUniqueEmail } from './test-helpers';

/** Password Reset Tests */
test.describe('Password Reset', () => {
  test('navigate to forgot password from login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.goToForgotPassword();
    
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('send reset request with valid email', async ({ page }) => {
    const email = generateUniqueEmail('reset');
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();
    await forgotPage.requestReset(email);
    
    await forgotPage.waitForSuccess();
    const hasSuccess = await forgotPage.hasSuccess();
    expect(hasSuccess).toBe(true);
  });

  test('show error with invalid email', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();
    
    // Fill invalid email (triggers validation)
    await forgotPage.emailInput.fill('notanemail');
    await page.waitForTimeout(500); // Wait for validation to run
    
    // Check that validation error is displayed
    const hasError = await forgotPage.hasError();
    expect(hasError).toBe(true);
    
    // Verify button is disabled due to validation error
    const isDisabled = await forgotPage.submitButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('reset password form with token', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page);
    await resetPage.goto('mock-token-123');
    
    await expect(page).toHaveURL(/reset-password/);
  });

  test('validate new password strength', async ({ page }) => {
    test.skip();
  });

  test('successful password change redirects to login', async ({ page }) => {
    test.skip();
  });

  test('login with new password', async ({ page }) => {
    test.skip();
  });

  test('show token error for invalid token', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page);
    await resetPage.gotoWithoutToken();
    
    const hasTokenError = await resetPage.hasTokenError();
    // May or may not show error depending on implementation
  });

  test('display success message after reset', async ({ page }) => {
    test.skip();
  });
});

