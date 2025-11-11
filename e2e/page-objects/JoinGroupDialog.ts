import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Join Group Dialog
 * 
 * Encapsulates join group dialog interactions following AAA pattern:
 * - Arrange: Initialize dialog and locators
 * - Act: Perform actions (enter code, submit)
 * - Assert: Verify outcomes (in test files)
 */
export class JoinGroupDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly codeInput: Locator;
  readonly errorMessage: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use accessible selectors for better reliability
    this.dialog = page.getByRole('dialog', { name: 'Dołącz do grupy' });
    this.codeInput = page.getByLabel('Kod zaproszenia');
    this.errorMessage = page.getByRole('alert');
    this.cancelButton = page.getByRole('button', { name: 'Anuluj' });
    this.submitButton = page.getByRole('button', { name: 'Dołącz' });
  }

  /**
   * Wait for dialog to be visible
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible', timeout: 10000 });
    // Add delay for React hydration
    await this.page.waitForTimeout(2000);
    // Also ensure the input is ready
    await this.codeInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Enter invitation code
   */
  async enterCode(code: string) {
    // Ensure input is ready before filling
    await this.codeInput.waitFor({ state: 'visible', timeout: 10000 });
    // Click to focus
    await this.codeInput.click();
    await this.page.waitForTimeout(300);
    // Clear the field first
    await this.codeInput.clear();
    // Use fill which is more reliable for React controlled inputs
    await this.codeInput.fill(code);
    // Wait a bit for React to process
    await this.page.waitForTimeout(500);
  }

  /**
   * Submit the join group form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Cancel the join group dialog
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Enter code and submit in one action
   */
  async joinGroup(code: string) {
    await this.enterCode(code);
    await this.submit();
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

  /**
   * Check if dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Wait for dialog to close
   */
  async waitForClose() {
    await this.dialog.waitFor({ state: 'hidden' });
  }
}

