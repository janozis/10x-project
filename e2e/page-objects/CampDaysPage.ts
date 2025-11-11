/* eslint-disable no-console */
import { Page, Locator } from "@playwright/test";

/**
 * Data interface for camp day editing
 */
export interface CampDayData {
  name?: string;
  date?: string;
  description?: string;
}

/**
 * Page Object Model for Camp Days Page
 *
 * Encapsulates camp days structure and scheduling interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (view days, schedule activities, edit days)
 * - Assert: Verify outcomes (in test files)
 */
export class CampDaysPage {
  readonly page: Page;

  // Page container and messages
  readonly campDaysPage: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly noResults: Locator;
  readonly clearFiltersButton: Locator;

  // Camp day cards
  readonly campDayCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use accessible selector instead of data-test-id since React hydration is slow
    // The element exists with aria-label immediately, test-id may come later
    this.campDaysPage = page.locator('section[aria-label="Zarządzanie dniami obozu"]');
    this.errorMessage = page.getByTestId("camp-days-error-message");
    this.retryButton = page.getByTestId("camp-days-retry-button");
    this.noResults = page.getByTestId("camp-days-no-results");
    this.clearFiltersButton = page.getByTestId("camp-days-clear-filters-button");

    // Camp day cards
    this.campDayCards = page.locator('[data-test-id="camp-day-card"]');
  }

  /**
   * Navigate to camp days page for a specific group
   */
  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}/camp-days`);
    await this.page.waitForLoadState("networkidle");
    // Wait for React hydration (component uses client:load)
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigate to specific camp day details
   */
  async gotoDay(groupId: string, dayId: string) {
    await this.page.goto(`/groups/${groupId}/camp-days/${dayId}`);
  }

  /**
   * Get count of displayed camp days
   */
  async getDayCount(): Promise<number> {
    return await this.campDayCards.count();
  }

  /**
   * Select a camp day by index
   */
  async selectDay(index: number) {
    await this.campDayCards.nth(index).click();
  }

  /**
   * Select a camp day by date
   */
  async selectDayByDate(date: string) {
    const dayCard = this.page.locator(`[data-test-id="camp-day-card"]:has-text("${date}")`);
    await dayCard.click();
  }

  /**
   * Add activity to a camp day
   * This assumes we're on a day details page with time slots
   */
  async addActivity(activityId: string, timeSlot: string) {
    // Click on the time slot
    const slot = this.page.locator(`[data-time-slot="${timeSlot}"]`);
    await slot.click();

    // Select activity from dropdown or dialog
    const activitySelect = this.page.locator("[data-activity-select]");
    await activitySelect.selectOption(activityId);

    // Confirm
    await this.page.getByRole("button", { name: /dodaj|add/i }).click();
  }

  /**
   * Remove activity from camp day schedule
   */
  async removeActivity(scheduleId: string) {
    const removeButton = this.page.locator(`[data-schedule-id="${scheduleId}"] [data-remove-button]`);
    await removeButton.click();

    // Confirm if dialog appears
    const confirmButton = this.page.getByRole("button", { name: /potwierdź|confirm/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Edit a camp day's details
   */
  async editDay(dayId: string, data: CampDayData) {
    // Open edit dialog/form
    const editButton = this.page.locator(`[data-day-id="${dayId}"] [data-edit-button]`);
    await editButton.click();

    // Fill form fields
    if (data.name) {
      await this.page.getByLabel(/nazwa|name/i).fill(data.name);
    }

    if (data.date) {
      await this.page.getByLabel(/data|date/i).fill(data.date);
    }

    if (data.description) {
      await this.page.getByLabel(/opis|description/i).fill(data.description);
    }

    // Submit
    await this.page.getByRole("button", { name: /zapisz|save/i }).click();
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.clearFiltersButton.click();
  }

  /**
   * Retry loading camp days after error
   */
  async retry() {
    await this.retryButton.click();
  }

  /**
   * Check if page has error
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }

  /**
   * Check if no results message is visible
   */
  async hasNoResults(): Promise<boolean> {
    return await this.noResults.isVisible();
  }

  /**
   * Wait for camp days to load
   */
  async waitForLoad() {
    // First wait for ANY sign the page loaded (breadcrumb or main content)
    try {
      await this.page.locator("main").waitFor({ state: "visible", timeout: 5000 });
    } catch {
      console.log("Warning: main element not visible");
    }

    // Then wait specifically for our component with generous timeout
    await this.campDaysPage.waitFor({ state: "visible", timeout: 20000 });
  }

  /**
   * Get camp day names from cards
   */
  async getDayNames(): Promise<string[]> {
    const cards = await this.campDayCards.all();
    const names: string[] = [];

    for (const card of cards) {
      const text = await card.textContent();
      if (text) {
        names.push(text.trim());
      }
    }

    return names;
  }

  /**
   * Check if a specific day exists by date
   */
  async hasDay(date: string): Promise<boolean> {
    const dayCard = this.page.locator(`[data-test-id="camp-day-card"]:has-text("${date}")`);
    return await dayCard.isVisible();
  }

  /**
   * Filter camp days by date range
   */
  async filterByDateRange(startDate: string, endDate: string) {
    const startDateInput = this.page.locator("[data-filter-start-date]");
    const endDateInput = this.page.locator("[data-filter-end-date]");

    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);
  }
}
