import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Individual Group Page
 * 
 * Encapsulates group detail page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (copy invite, restore, delete)
 * - Assert: Verify outcomes (in test files)
 */
export class GroupPage {
  readonly page: Page;
  readonly copyInviteCodeButton: Locator;
  readonly copyInviteLinkButton: Locator;
  readonly copyInviteButtonOnCard: Locator;
  readonly restoreButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use data-test-id attributes for stable selectors
    // Dashboard buttons (when viewing /groups/:id/dashboard)
    this.copyInviteCodeButton = page.getByTestId('groups-dashboard-copy-code-button');
    this.copyInviteLinkButton = page.getByTestId('groups-dashboard-copy-link-button');
    // Card button (when on groups list)
    this.copyInviteButtonOnCard = page.getByTestId('groups-card-copy-invite-button');
    this.restoreButton = page.getByTestId('groups-card-restore-button');
  }

  /**
   * Navigate to specific group page
   */
  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}`);
  }

  /**
   * Copy invitation code to clipboard (from dashboard)
   */
  async copyInviteCode() {
    await this.copyInviteCodeButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.copyInviteCodeButton.click();
    // Wait a bit for clipboard operation
    await this.page.waitForTimeout(300);
  }

  /**
   * Copy invitation link to clipboard (from dashboard)
   */
  async copyInviteLink() {
    await this.copyInviteLinkButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.copyInviteLinkButton.click();
    // Wait a bit for clipboard operation
    await this.page.waitForTimeout(300);
  }

  /**
   * Copy invitation code from card on groups list
   */
  async copyInviteCodeFromCard() {
    await this.copyInviteButtonOnCard.click();
    // Wait a bit for clipboard operation
    await this.page.waitForTimeout(300);
  }

  /**
   * Get invitation code from the page
   * This assumes the code is visible somewhere on the page
   */
  async getInviteCode(): Promise<string> {
    // Wait for clipboard API or extract from UI
    // This is a placeholder - actual implementation depends on UI structure
    const codeElement = this.page.locator('[data-invite-code]');
    return await codeElement.textContent() || '';
  }

  /**
   * Restore a deleted group
   */
  async restoreGroup() {
    await this.restoreButton.click();
  }

  /**
   * Delete the current group
   * Note: This assumes there's a delete button/action in the group settings
   */
  async deleteGroup() {
    // This will need to be implemented based on actual delete UI
    // Likely in a settings dialog or menu
    await this.page.getByRole('button', { name: /usuń|delete/i }).click();
    // May need to confirm in a dialog
    await this.page.getByRole('button', { name: /potwierdź|confirm/i }).click();
  }

  /**
   * Navigate to group members page
   */
  async goToMembers() {
    await this.page.getByRole('link', { name: /członkowie|members/i }).click();
  }

  /**
   * Navigate to group activities page
   */
  async goToActivities() {
    await this.page.getByRole('link', { name: /aktywności|activities/i }).click();
  }

  /**
   * Navigate to group settings page
   */
  async goToSettings() {
    await this.page.getByRole('link', { name: /ustawienia|settings/i }).click();
  }

  /**
   * Navigate to group dashboard/overview
   */
  async goToDashboard() {
    await this.page.getByRole('link', { name: /dashboard|pulpit/i }).click();
  }

  /**
   * Navigate to camp days page
   */
  async goToCampDays() {
    await this.page.getByRole('link', { name: /dni obozu|camp days/i }).click();
  }

  /**
   * Navigate to tasks page
   */
  async goToTasks() {
    await this.page.getByRole('link', { name: /zadania|tasks/i }).click();
  }

  /**
   * Check if restore button is visible (indicates deleted group)
   */
  async canRestore(): Promise<boolean> {
    return await this.restoreButton.isVisible();
  }

  /**
   * Check if copy invite button is visible (checks dashboard first, then card)
   */
  async canCopyInvite(): Promise<boolean> {
    try {
      // Try dashboard button first (with short timeout)
      return await this.copyInviteCodeButton.isVisible({ timeout: 1000 });
    } catch {
      // Fall back to card button
      return await this.copyInviteButtonOnCard.isVisible({ timeout: 1000 }).catch(() => false);
    }
  }
}

