import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Group Members Page
 * 
 * Encapsulates group members page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (search, filter, change roles, remove members)
 * - Assert: Verify outcomes (in test files)
 */
export class GroupMembersPage {
  readonly page: Page;
  
  // Members table
  readonly membersTable: Locator;
  readonly memberRows: Locator;
  readonly sortButton: Locator;
  
  // Toolbar and filters
  readonly searchInput: Locator;
  readonly roleFilter: Locator;
  readonly sortDropdown: Locator;
  readonly countBadge: Locator;
  readonly clearButton: Locator;
  
  // Member actions
  readonly roleSelects: Locator;
  readonly promoteButtons: Locator;
  readonly removeButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use data-test-id attributes for stable selectors
    this.membersTable = page.getByTestId('members-table');
    this.memberRows = page.locator('[data-test-id="members-table-row"]');
    this.sortButton = page.getByTestId('members-table-sort-button');
    
    // Toolbar
    this.searchInput = page.getByTestId('members-search-input');
    this.roleFilter = page.getByTestId('members-role-filter');
    this.sortDropdown = page.getByTestId('members-sort-button');
    this.countBadge = page.getByTestId('members-count-badge');
    this.clearButton = page.getByTestId('members-clear-button');
    
    // Actions
    this.roleSelects = page.locator('[data-test-id="members-role-select"]');
    this.promoteButtons = page.locator('[data-test-id="members-promote-button"]');
    this.removeButtons = page.locator('[data-test-id="members-remove-button"]');
  }

  /**
   * Navigate to members page for a specific group
   */
  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}/members`);
  }

  /**
   * Search for members by query
   */
  async searchMembers(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    await this.searchInput.clear();
  }

  /**
   * Filter members by role
   */
  async filterByRole(role: string) {
    await this.roleFilter.selectOption(role);
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.clearButton.click();
  }

  /**
   * Sort members using the sort button
   */
  async sortMembers() {
    await this.sortButton.click();
  }

  /**
   * Get count of displayed members
   */
  async getMemberCount(): Promise<number> {
    // Try data-test-id first, fallback to tbody tr selector
    const count = await this.memberRows.count();
    if (count > 0) return count;
    // Fallback
    return await this.page.locator('tbody tr').count();
  }

  /**
   * Get count badge text
   */
  async getCountBadgeText(): Promise<string> {
    return await this.countBadge.textContent() || '';
  }

  /**
   * Change role of a member at specific index
   */
  async changeRole(index: number, newRole: string) {
    const roleSelect = this.roleSelects.nth(index);
    await roleSelect.selectOption(newRole);
  }

  /**
   * Promote a member to admin at specific index
   */
  async promoteMember(index: number) {
    await this.promoteButtons.nth(index).click();
  }

  /**
   * Remove a member at specific index
   */
  async removeMember(index: number) {
    await this.removeButtons.nth(index).click();
    // May need to confirm in a dialog
    const confirmButton = this.page.getByRole('button', { name: /potwierdź|confirm/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Get member name by row index
   */
  async getMemberName(index: number): Promise<string> {
    const row = this.memberRows.nth(index);
    return await row.textContent() || '';
  }

  /**
   * Find member row by email or name
   */
  async findMemberByEmail(email: string): Promise<Locator> {
    return this.page.locator(`[data-test-id="members-table-row"]:has-text("${email}")`);
  }

  /**
   * Check if members table is visible
   */
  async hasMembersTable(): Promise<boolean> {
    // Try data-test-id first
    const hasTestId = await this.membersTable.isVisible().catch(() => false);
    if (hasTestId) return true;
    // Fallback: check for any table
    return await this.page.locator('table').first().isVisible().catch(() => false);
  }

  /**
   * Wait for members to load
   */
  async waitForLoad() {
    // Wait for table - use shorter timeouts since we already waited for hydration
    // Try data-test-id first, fallback to table selector
    try {
      await this.membersTable.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // Fallback: wait for any table element
      await this.page.locator('table').first().waitFor({ state: 'visible', timeout: 3000 });
    }
    
    // Wait for at least one row
    try {
      await this.memberRows.first().waitFor({ state: 'visible', timeout: 2000 });
    } catch {
      // Fallback: wait for any table row in tbody
      await this.page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 2000 });
    }
  }

  /**
   * Get all member emails from the table
   */
  async getMemberEmails(): Promise<string[]> {
    const rows = await this.memberRows.all();
    const emails: string[] = [];
    
    for (const row of rows) {
      const text = await row.textContent();
      // Extract email using regex or specific selector
      const emailMatch = text?.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        emails.push(emailMatch[0]);
      }
    }
    
    return emails;
  }

  /**
   * Check if a specific member exists by email
   */
  async hasMember(email: string): Promise<boolean> {
    const member = await this.findMemberByEmail(email);
    return await member.isVisible();
  }
}

