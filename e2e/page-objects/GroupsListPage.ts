import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Groups List Page
 *
 * Encapsulates groups list page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (create, join, filter)
 * - Assert: Verify outcomes (in test files)
 */
export class GroupsListPage {
  readonly page: Page;

  // Header tabs and buttons
  readonly activeTab: Locator;
  readonly deletedTab: Locator;
  readonly joinButton: Locator;
  readonly createButton: Locator;

  // Group cards and list
  readonly groupCards: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyCreateButton: Locator;
  readonly emptyJoinButton: Locator;

  // Messages and feedback
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly unauthorizedError: Locator;
  readonly loginLink: Locator;
  readonly liveRegion: Locator;

  // Actions
  readonly refreshButton: Locator;
  readonly loadMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header tabs and buttons
    // Use role-based selectors since React may not be hydrated initially with data-test-ids
    this.activeTab = page.getByRole("tab", { name: "Aktywne" });
    this.deletedTab = page.getByRole("tab", { name: "Ostatnio usunięte" });
    this.joinButton = page.getByRole("button", { name: "Dołącz do grupy" }).first();
    this.createButton = page.getByRole("button", { name: "Utwórz grupę" }).first();

    // Group cards
    this.groupCards = page.locator('[data-test-id="groups-list-card"]');

    // Empty state
    this.emptyState = page.getByTestId("groups-empty-state");
    this.emptyStateMessage = page.getByRole("heading", { name: "Brak grup" });
    // Empty state buttons (use .last() since header has same text)
    this.emptyCreateButton = page.getByRole("button", { name: "Utwórz grupę" }).last();
    this.emptyJoinButton = page.getByRole("button", { name: "Dołącz do grupy" }).last();

    // Messages
    this.successMessage = page.getByTestId("groups-success-message");
    this.errorMessage = page.getByTestId("groups-error-message");
    this.unauthorizedError = page.getByTestId("groups-unauthorized-error");
    this.loginLink = page.getByTestId("groups-login-link");
    this.liveRegion = page.getByTestId("groups-live-region");

    // Actions
    this.refreshButton = page.getByTestId("groups-refresh-button");
    this.loadMoreButton = page.getByTestId("groups-load-more-button");
  }

  /**
   * Navigate to groups page
   */
  async goto() {
    await this.page.goto("/groups");
  }

  /**
   * Wait for page to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get number of group cards displayed
   */
  async getGroupCount(): Promise<number> {
    return await this.groupCards.count();
  }

  /**
   * Click on a group card by name
   */
  async clickGroupByName(name: string) {
    await this.page.getByRole("link", { name }).click();
  }

  /**
   * Switch to active groups tab
   */
  async showActiveGroups() {
    await this.activeTab.click();
  }

  /**
   * Switch to deleted groups tab
   */
  async showDeletedGroups() {
    await this.deletedTab.click();
  }

  /**
   * Open create group dialog
   */
  async openCreateDialog() {
    // Wait for button to be visible (in header, not empty state)
    // Use first() to get the header button (second one is in empty state)
    await this.createButton.waitFor({ state: "visible", timeout: 10000 });

    // Add a small delay to ensure React has fully hydrated
    await this.page.waitForTimeout(1000);

    // Wait for React hydration by checking if button is actionable
    // This ensures event handlers are attached
    await this.createButton.click({ timeout: 10000 });

    // Verify dialog actually opens (React event handler fired)
    // Use a longer timeout and retry mechanism
    await this.page.waitForSelector('[data-test-id="groups-create-dialog"]', { state: "visible", timeout: 15000 });
  }

  /**
   * Open create group dialog from empty state
   */
  async openCreateDialogFromEmpty() {
    await this.emptyCreateButton.waitFor({ state: "visible", timeout: 10000 });

    // Add a small delay to ensure React has fully hydrated
    await this.page.waitForTimeout(1000);

    await this.emptyCreateButton.click();

    // Wait for dialog to actually open
    await this.page.waitForSelector('[data-test-id="groups-create-dialog"]', { state: "visible", timeout: 15000 });
  }

  /**
   * Open join group dialog
   */
  async openJoinDialog() {
    // Wait for button to be visible and React to hydrate
    await this.joinButton.waitFor({ state: "visible", timeout: 10000 });

    // Add a small delay to ensure React has fully hydrated
    await this.page.waitForTimeout(1000);

    await this.joinButton.click();

    // Wait for dialog to actually open (React event handler fired)
    await this.page.waitForSelector('[data-test-id="groups-join-dialog"]', { state: "visible", timeout: 15000 });
  }

  /**
   * Open join group dialog from empty state
   */
  async openJoinDialogFromEmpty() {
    await this.emptyJoinButton.waitFor({ state: "visible", timeout: 10000 });

    // Add a small delay to ensure React has fully hydrated
    await this.page.waitForTimeout(1000);

    await this.emptyJoinButton.click();

    // Wait for dialog to actually open
    await this.page.waitForSelector('[data-test-id="groups-join-dialog"]', { state: "visible", timeout: 15000 });
  }

  /**
   * Refresh groups list
   */
  async refresh() {
    await this.refreshButton.click();
  }

  /**
   * Load more groups
   */
  async loadMore() {
    await this.loadMoreButton.click();
  }

  /**
   * Check if empty state is visible
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    return (await this.successMessage.textContent()) || "";
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }

  /**
   * Check if unauthorized error is shown
   */
  async hasUnauthorizedError(): Promise<boolean> {
    return await this.unauthorizedError.isVisible();
  }

  /**
   * Click login link from unauthorized error
   */
  async goToLoginFromError() {
    await this.loginLink.click();
  }

  /**
   * Check if success message is visible
   */
  async hasSuccess(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}
