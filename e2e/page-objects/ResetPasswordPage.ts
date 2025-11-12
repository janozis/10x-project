import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Reset Password Page
 *
 * Encapsulates reset password page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (reset password, navigate)
 * - Assert: Verify outcomes (in test files)
 */
export class ResetPasswordPage {
  readonly page: Page;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly tokenErrorMessage: Locator;
  readonly successMessage: Locator;
  readonly loginLink: Locator;
  readonly forgotLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use data-test-id attributes for stable selectors
    this.passwordInput = page.getByTestId("auth-password-input");
    this.submitButton = page.getByTestId("auth-reset-submit-button");
    this.errorMessage = page.getByTestId("auth-reset-error-message");
    this.tokenErrorMessage = page.getByTestId("auth-reset-token-error-message");
    this.successMessage = page.getByTestId("auth-reset-success-message");
    this.loginLink = page.getByTestId("auth-reset-login-link");
    this.forgotLink = page.getByTestId("auth-reset-forgot-link");
  }

  /**
   * Navigate to reset password page with token
   */
  async goto(token: string) {
    await this.page.goto(`/auth/reset-password?token=${token}`);
  }

  /**
   * Navigate to reset password page without token
   */
  async gotoWithoutToken() {
    await this.page.goto("/auth/reset-password");
  }

  /**
   * Reset password with new password
   */
  async resetPassword(newPassword: string) {
    await this.passwordInput.fill(newPassword);
    await this.submitButton.click();
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginLink.click();
  }

  /**
   * Navigate to forgot password page to resend link
   */
  async goToForgotPassword() {
    await this.forgotLink.click();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get token error message text
   */
  async getTokenErrorMessage(): Promise<string> {
    return (await this.tokenErrorMessage.textContent()) || "";
  }

  /**
   * Check if token error message is visible
   */
  async hasTokenError(): Promise<boolean> {
    return await this.tokenErrorMessage.isVisible();
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    return (await this.successMessage.textContent()) || "";
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
    await this.successMessage.waitFor({ state: "visible" });
  }
}
