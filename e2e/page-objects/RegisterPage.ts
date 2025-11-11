import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Registration Page
 *
 * Encapsulates registration page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (register, navigate)
 * - Assert: Verify outcomes (in test files)
 */
export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use data-test-id attributes for stable selectors
    this.emailInput = page.getByTestId("auth-email-input");
    this.passwordInput = page.getByTestId("auth-password-input");
    this.registerButton = page.getByTestId("auth-register-submit-button");
    this.errorMessage = page.getByTestId("auth-register-error-message");
    this.successMessage = page.getByTestId("auth-register-success-message");
    this.loginLink = page.getByTestId("auth-register-login-link");
  }

  /**
   * Navigate to registration page
   */
  async goto() {
    await this.page.goto("/auth/register", { waitUntil: "load" });
    // Wait for page to fully load
    await this.page.waitForLoadState("networkidle");
    // Add delay for React hydration (Astro client:load)
    await this.page.waitForTimeout(1500);
    // Wait for React to hydrate by checking if form elements are visible
    await this.emailInput.waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Perform registration with credentials
   */
  async register(email: string, password: string) {
    // Ensure form is ready before filling
    await this.emailInput.waitFor({ state: "visible", timeout: 10000 });
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginLink.click();
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
}
