import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Activity Details Page
 *
 * Encapsulates activity details page interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (view details, request AI evaluation, edit)
 * - Assert: Verify outcomes (in test files)
 */
export class ActivityDetailsPage {
  readonly page: Page;

  // AI Evaluation Panel
  readonly aiEvaluationPanel: Locator;
  readonly requestEvaluationButton: Locator;

  // Activity display fields (by label)
  // These will be used to verify displayed content

  constructor(page: Page) {
    this.page = page;

    // Use data-test-id attributes for stable selectors
    this.aiEvaluationPanel = page.getByTestId("ai-evaluation-panel");
    this.requestEvaluationButton = page.getByTestId("ai-evaluation-request-button");
  }

  /**
   * Navigate to activity details page
   */
  async goto(groupId: string, activityId: string) {
    await this.page.goto(`/groups/${groupId}/activities/${activityId}`);
  }

  /**
   * Request AI evaluation for the activity
   */
  async requestAIEvaluation() {
    await this.requestEvaluationButton.click();
  }

  /**
   * Wait for AI evaluation to complete
   * This waits for the evaluation results to appear
   * @returns true if evaluation appeared, false if timeout
   */
  async waitForEvaluation(timeout = 30000): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-test-id="ai-evaluation-result"]', { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get AI evaluation lore score
   */
  async getEvaluationScore(): Promise<string> {
    const scoreElement = this.page.getByTestId("ai-evaluation-lore-score");
    return (await scoreElement.textContent()) || "";
  }

  /**
   * Get AI evaluation feedback text (lore)
   */
  async getEvaluationFeedback(): Promise<string> {
    const feedbackElement = this.page.getByTestId("ai-evaluation-lore-feedback");
    return (await feedbackElement.textContent()) || "";
  }

  /**
   * Check if AI evaluation panel is visible
   */
  async hasEvaluationPanel(): Promise<boolean> {
    return await this.aiEvaluationPanel.isVisible();
  }

  /**
   * Check if request evaluation button is visible
   */
  async canRequestEvaluation(): Promise<boolean> {
    return await this.requestEvaluationButton.isVisible();
  }

  /**
   * Check if evaluation results are displayed
   */
  async hasEvaluationResults(): Promise<boolean> {
    const resultElement = this.page.getByTestId("ai-evaluation-result");
    return await resultElement.isVisible().catch(() => false);
  }

  /**
   * Navigate to edit page
   */
  async edit() {
    const editButton = this.page.getByRole("link", { name: /edytuj|edit/i });
    await editButton.click();
  }

  /**
   * Check if edit button is visible (user has permission)
   */
  async canEdit(): Promise<boolean> {
    const editButton = this.page.getByRole("link", { name: /edytuj|edit/i });
    try {
      // Wait for button to be attached to DOM and potentially visible
      await editButton.waitFor({ state: "attached", timeout: 5000 });
      // Scroll to button to ensure it's in viewport
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await editButton.scrollIntoViewIfNeeded().catch(() => {});
      // Small wait for any animations
      await this.page.waitForTimeout(300);
      return await editButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get activity field value by label
   * Generic method to read any activity field
   */
  async getFieldValue(fieldLabel: string): Promise<string> {
    const field = this.page.locator(`[data-field="${fieldLabel}"]`);
    return (await field.textContent()) || "";
  }

  /**
   * Get activity title/temat
   */
  async getTitle(): Promise<string> {
    return await this.getFieldValue("temat");
  }

  /**
   * Get activity goal/cel
   */
  async getGoal(): Promise<string> {
    return await this.getFieldValue("cel");
  }

  /**
   * Get activity duration/czas
   */
  async getDuration(): Promise<string> {
    return await this.getFieldValue("czas");
  }

  /**
   * Get activity location/miejsce
   */
  async getLocation(): Promise<string> {
    return await this.getFieldValue("miejsce");
  }

  /**
   * Get activity materials/materiały
   */
  async getMaterials(): Promise<string> {
    return await this.getFieldValue("materiały");
  }

  /**
   * Get activity responsible persons/odpowiedzialni
   */
  async getResponsiblePersons(): Promise<string> {
    return await this.getFieldValue("odpowiedzialni");
  }

  /**
   * Get activity knowledge scope/zakres wiedzy
   */
  async getKnowledgeScope(): Promise<string> {
    return await this.getFieldValue("zakres wiedzy");
  }

  /**
   * Get activity participants/uczestnicy
   */
  async getParticipants(): Promise<string> {
    return await this.getFieldValue("uczestnicy");
  }

  /**
   * Get activity course/przebieg
   */
  async getCourse(): Promise<string> {
    return await this.getFieldValue("przebieg");
  }

  /**
   * Get activity summary/podsumowanie
   */
  async getSummary(): Promise<string> {
    return await this.getFieldValue("podsumowanie");
  }

  /**
   * Delete the activity
   */
  async delete() {
    const deleteButton = this.page.getByRole("button", { name: /usuń|delete/i });
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmButton = this.page.getByRole("button", { name: /potwierdź|confirm/i });
    await confirmButton.click();
  }

  /**
   * Check if delete button is visible
   */
  async canDelete(): Promise<boolean> {
    const deleteButton = this.page.getByRole("button", { name: /usuń|delete/i });
    return await deleteButton.isVisible();
  }

  /**
   * Wait for page to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }
}
