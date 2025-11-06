import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Login Page
 * 
 * Encapsulates login page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (login, navigate)
 * - Assert: Verify outcomes (in test files)
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use semantic selectors (preferred) or data-testid when needed
    this.emailInput = page.getByLabel(/email/i);
    // Password field - use input selector since type="password" is not a textbox role
    this.passwordInput = page.locator('input[type="password"][name="password"]');
    this.loginButton = page.getByRole('button', { name: /zaloguj|login|sign in/i });
    this.errorMessage = page.locator('[role="alert"], .error-message').first();
    this.registerLink = page.getByRole('link', { name: /zarejestruj|register|sign up/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /zapomniałeś|forgot.*password/i });
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/auth/login');
  }

  /**
   * Perform login with credentials
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Quick login with environment credentials
   */
  async loginWithTestUser() {
    const email = process.env.E2E_USERNAME!;
    const password = process.env.E2E_PASSWORD!;
    await this.login(email, password);
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword() {
    if (await this.forgotPasswordLink.isVisible()) {
      await this.forgotPasswordLink.click();
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}

