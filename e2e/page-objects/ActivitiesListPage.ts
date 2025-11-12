import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Activities List Page
 *
 * Encapsulates activities list page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (search, filter, create)
 * - Assert: Verify outcomes (in test files)
 */
export class ActivitiesListPage {
  readonly page: Page;

  // Table and rows
  readonly activitiesTable: Locator;
  readonly activityRows: Locator;
  readonly rowCheckboxes: Locator;

  // Toolbar and filters
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly assignedCheckbox: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use data-test-id attributes for stable selectors
    this.activitiesTable = page.getByTestId("activities-table");
    this.activityRows = page.locator('[data-test-id="activities-table-row"]');
    this.rowCheckboxes = page.locator('[data-test-id="activities-row-checkbox"]');

    // Toolbar
    this.searchInput = page.getByTestId("activities-search-input");
    this.statusFilter = page.getByTestId("activities-status-filter");
    this.assignedCheckbox = page.getByTestId("activities-assigned-checkbox");
    this.createButton = page.getByTestId("activities-create-button");
  }

  /**
   * Navigate to activities page for a specific group
   */
  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}/activities`);
    await this.page.waitForLoadState("networkidle");

    // CRITICAL: Wait for React hydration and permissions loading
    // The create button appears after permissions are loaded
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for activities by query
   */
  async searchActivities(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    await this.searchInput.clear();
  }

  /**
   * Filter activities by status
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
  }

  /**
   * Toggle "show only my activities" filter
   */
  async showOnlyAssigned() {
    await this.assignedCheckbox.check();
  }

  /**
   * Show all activities (uncheck assigned filter)
   */
  async showAllActivities() {
    await this.assignedCheckbox.uncheck();
  }

  /**
   * Click create activity button to open form
   * Waits for the button to be visible (depends on permissions loading)
   */
  async createActivity() {
    // Wait for the create button to appear (permissions need to load first)
    await this.createButton.waitFor({ state: "visible", timeout: 10000 });

    // Give extra time for event handlers to attach after hydration
    await this.page.waitForTimeout(200);

    await this.createButton.click();
  }

  /**
   * Get count of displayed activities
   */
  async getActivityCount(): Promise<number> {
    return await this.activityRows.count();
  }

  /**
   * Click on an activity row by index
   */
  async clickActivity(index: number) {
    await this.activityRows.nth(index).click();
  }

  /**
   * Click on an activity by its name/title
   */
  async clickActivityByName(name: string) {
    await this.page.getByRole("link", { name }).click();
  }

  /**
   * Select an activity by checking its checkbox
   */
  async selectActivity(index: number) {
    await this.rowCheckboxes.nth(index).check();
  }

  /**
   * Select multiple activities
   */
  async selectActivities(indices: number[]) {
    for (const index of indices) {
      await this.selectActivity(index);
    }
  }

  /**
   * Check if activities table is visible
   */
  async hasActivitiesTable(): Promise<boolean> {
    return await this.activitiesTable.isVisible();
  }

  /**
   * Wait for activities to load
   * Waits for either the table or empty state to appear
   */
  async waitForLoad() {
    // Wait for either table or empty state message
    await this.page
      .waitForSelector('[data-test-id="activities-table"], text=Brak aktywności', { timeout: 10000 })
      .catch(() => {
        // If neither appears, that's okay - might be in loading state
      });

    // Additional wait for React hydration
    await this.page.waitForTimeout(500);
  }

  /**
   * Get activity names from the table
   */
  async getActivityNames(): Promise<string[]> {
    const rows = await this.activityRows.all();
    const names: string[] = [];

    for (const row of rows) {
      const text = await row.textContent();
      if (text) {
        names.push(text.trim());
      }
    }

    return names;
  }
}
