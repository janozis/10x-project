import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Forgot Password Page
 * 
 * Encapsulates forgot password page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (request reset, navigate)
 * - Assert: Verify outcomes (in test files)
 */
export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loginLink: Locator;
  readonly registerLink: Locator;
  readonly emailError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use data-test-id attributes for stable selectors
    this.emailInput = page.getByTestId('auth-email-input');
    this.submitButton = page.getByTestId('auth-forgot-submit-button');
    this.errorMessage = page.getByTestId('auth-forgot-error-message');
    this.successMessage = page.getByTestId('auth-forgot-success-message');
    this.loginLink = page.getByTestId('auth-forgot-login-link');
    this.registerLink = page.getByTestId('auth-forgot-register-link');
    
    // Field-level validation error (find by text-destructive class near email input)
    this.emailError = page.locator('#email').locator('..').locator('.text-destructive');
  }

  /**
   * Navigate to forgot password page
   */
  async goto() {
    await this.page.goto('/auth/forgot-password');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Wait longer for form hydration
  }

  /**
   * Request password reset for given email
   */
  async requestReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginLink.click();
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if error message is visible (banner or field-level)
   */
  async hasError(): Promise<boolean> {
    // Check for banner error message
    const hasBannerError = await this.errorMessage.isVisible().catch(() => false);
    if (hasBannerError) return true;
    
    // Check for field-level validation error
    const hasFieldError = await this.hasEmailError();
    return hasFieldError;
  }

  /**
   * Check if email field has validation error
   */
  async hasEmailError(): Promise<boolean> {
    return await this.emailError.isVisible().catch(() => false);
  }

  /**
   * Get email field validation error text
   */
  async getEmailError(): Promise<string> {
    return await this.emailError.textContent() || '';
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    return await this.successMessage.textContent() || '';
  }

  /**
   * Check if success message is visible
   */
  async hasSuccess(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  /**
   * Wait for success message to appear
   */
  async waitForSuccess() {
    await this.successMessage.waitFor({ state: 'visible' });
  }
}

