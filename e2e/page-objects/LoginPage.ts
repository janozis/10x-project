/* eslint-disable no-console */
import { Page, Locator } from "@playwright/test";

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
  readonly successMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use accessible selectors for better reliability
    this.emailInput = page.getByLabel("Email", { exact: true });
    this.passwordInput = page.getByLabel("Hasło", { exact: true });
    this.loginButton = page.getByRole("button", { name: "Zaloguj" });
    this.errorMessage = page.getByTestId("auth-login-error-message");
    this.successMessage = page.getByTestId("auth-login-success-message");
    // Use more specific locator for register link (inside main, not header)
    this.registerLink = page.locator('main a[href="/auth/register"]:has-text("Zarejestruj się")');
    this.forgotPasswordLink = page.getByRole("link", { name: "Zapomniałeś hasła?" });
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto("/auth/login");
    await this.page.waitForLoadState("networkidle");
    // Wait for React hydration and UI to fully render
    // LoginCard uses client:load so needs extra time for hydration
    await this.page.waitForTimeout(500);

    // Wait a bit more to ensure all React components in LoginCard are ready
    await this.page.waitForTimeout(500);
  }

  /**
   * Perform login with credentials
   */
  async login(email: string, password: string) {
    // Clear existing values first
    await this.emailInput.clear();
    await this.passwordInput.clear();

    // Fill email with proper interaction
    await this.emailInput.click();
    await this.emailInput.fill(email);
    await this.emailInput.press("Tab"); // Trigger validation

    // Wait a bit for validation
    await this.page.waitForTimeout(300);

    // Fill password
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    await this.passwordInput.press("Tab"); // Trigger validation

    // Wait for React validation to complete
    await this.page.waitForTimeout(500);

    // Try clicking the button with force if needed
    try {
      await this.loginButton.click({ timeout: 5000 });
    } catch {
      console.log("   ⚠️  Button not clickable, trying with force...");
      await this.loginButton.click({ force: true });
    }

    // Wait for navigation to start (this is important!)
    await this.page.waitForTimeout(500);
  }

  /**
   * Quick login with environment credentials (first test user)
   */
  async loginWithTestUser() {
    const email = process.env.E2E_USERNAME || "";
    const password = process.env.E2E_PASSWORD || "";
    await this.login(email, password);
  }

  /**
   * Quick login with second test user credentials
   */
  async loginWithSecondTestUser() {
    const email = process.env.E2E_2_USERNAME || "";
    const password = process.env.E2E_2_PASSWORD || "";
    await this.login(email, password);
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    // Wait for the link to be visible (it's in LoginCard which needs React hydration)
    await this.registerLink.waitFor({ state: "visible", timeout: 10000 });
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
