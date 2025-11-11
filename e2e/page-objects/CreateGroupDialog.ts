import { Page, Locator } from '@playwright/test';

/**
 * Data interface for creating a group
 */
export interface CreateGroupData {
  name: string;
  description?: string;
  lore_theme?: string;
  start_date?: string;
  end_date?: string;
  max_members?: number;
}

/**
 * Page Object Model for Create Group Dialog
 * 
 * Encapsulates create group dialog interactions following AAA pattern:
 * - Arrange: Initialize dialog and locators
 * - Act: Perform actions (fill form, submit)
 * - Assert: Verify outcomes (in test files)
 */
export class CreateGroupDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly loreInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly maxMembersInput: Locator;
  readonly errorMessage: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly nameError: Locator;
  readonly descriptionError: Locator;
  readonly loreError: Locator;
  readonly startDateError: Locator;
  readonly endDateError: Locator;
  readonly maxMembersError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use role-based selectors for better reliability (React hydration)
    this.dialog = page.getByRole('dialog', { name: 'Utwórz grupę' });
    this.nameInput = page.getByRole('textbox', { name: 'Nazwa' });
    this.descriptionInput = page.getByRole('textbox', { name: 'Opis' });
    this.loreInput = page.getByRole('textbox', { name: 'Motyw/lore' });
    this.startDateInput = page.getByRole('textbox', { name: 'Data startu' });
    this.endDateInput = page.getByRole('textbox', { name: 'Data końca' });
    this.maxMembersInput = page.getByRole('spinbutton', { name: /Limit członków/ });
    this.errorMessage = page.getByRole('alert');
    this.cancelButton = page.getByRole('button', { name: 'Anuluj' });
    this.submitButton = page.getByRole('button', { name: 'Utwórz' });
    
    // Field-level validation error messages
    this.nameError = page.locator('#name-error');
    this.descriptionError = page.locator('#desc-error');
    this.loreError = page.locator('#lore-error');
    this.startDateError = page.locator('#start-error');
    this.endDateError = page.locator('#end-error');
    this.maxMembersError = page.locator('#max-error');
  }

  /**
   * Wait for dialog to be visible
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible' });
  }

  /**
   * Fill the create group form with provided data
   */
  async fillForm(data: CreateGroupData) {
    await this.nameInput.fill(data.name);
    
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
    
    if (data.lore_theme) {
      await this.loreInput.fill(data.lore_theme);
    }
    
    if (data.start_date) {
      await this.startDateInput.fill(data.start_date);
    }
    
    if (data.end_date) {
      await this.endDateInput.fill(data.end_date);
    }
    
    if (data.max_members !== undefined) {
      await this.maxMembersInput.fill(data.max_members.toString());
    }
  }

  /**
   * Submit the create group form
   */
  async submit() {
    // Wait for submit button to be enabled and clickable
    await this.submitButton.waitFor({ state: 'visible' });
    
    // Extra wait to ensure React validation has run
    await this.page.waitForTimeout(500);
    
    await this.submitButton.click();
  }

  /**
   * Cancel the create group dialog
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Fill form and submit in one action
   */
  async createGroup(data: CreateGroupData) {
    await this.fillForm(data);
    await this.submit();
    
    // Wait a bit for form submission to process
    await this.page.waitForTimeout(1000);
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
    
    // Check for field-level validation errors
    const hasNameError = await this.nameError.isVisible().catch(() => false);
    const hasDescError = await this.descriptionError.isVisible().catch(() => false);
    const hasLoreError = await this.loreError.isVisible().catch(() => false);
    const hasStartError = await this.startDateError.isVisible().catch(() => false);
    const hasEndError = await this.endDateError.isVisible().catch(() => false);
    const hasMaxError = await this.maxMembersError.isVisible().catch(() => false);
    
    return hasNameError || hasDescError || hasLoreError || hasStartError || hasEndError || hasMaxError;
  }

  /**
   * Check if a specific field has a validation error
   */
  async hasFieldError(field: 'name' | 'description' | 'lore' | 'start_date' | 'end_date' | 'max_members'): Promise<boolean> {
    const errorMap = {
      name: this.nameError,
      description: this.descriptionError,
      lore: this.loreError,
      start_date: this.startDateError,
      end_date: this.endDateError,
      max_members: this.maxMembersError,
    };
    
    return await errorMap[field].isVisible().catch(() => false);
  }

  /**
   * Get field error message text
   */
  async getFieldError(field: 'name' | 'description' | 'lore' | 'start_date' | 'end_date' | 'max_members'): Promise<string> {
    const errorMap = {
      name: this.nameError,
      description: this.descriptionError,
      lore: this.loreError,
      start_date: this.startDateError,
      end_date: this.endDateError,
      max_members: this.maxMembersError,
    };
    
    return await errorMap[field].textContent() || '';
  }

  /**
   * Check if dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Wait for dialog to close OR for an error to appear
   * Throws if dialog doesn't close and no error appears
   */
  async waitForClose() {
    // Race between dialog closing and error appearing
    try {
      await Promise.race([
        // Option 1: Dialog closes successfully
        this.dialog.waitFor({ state: 'hidden', timeout: 10000 }),
        // Option 2: Error appears (validation or API error)
        this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }).then(() => {
          throw new Error('Form submission failed - error message appeared');
        })
      ]);
    } catch (error) {
      // If error message is visible, get its text for better debugging
      const isErrorVisible = await this.errorMessage.isVisible().catch(() => false);
      if (isErrorVisible) {
        const errorText = await this.getErrorMessage();
        throw new Error(`Dialog did not close. Error message: "${errorText}"`);
      }
      throw error;
    }
  }
}

