import { Page, Locator } from '@playwright/test';

/**
 * Data interface for task creation/editing
 */
export interface TaskData {
  title: string;
  dueDate?: string;
  description?: string;
  activityId?: string;
}

/**
 * Page Object Model for Tasks Page
 * 
 * Encapsulates tasks board and form interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (create, edit, delete, change status)
 * - Assert: Verify outcomes (in test files)
 */
export class TasksPage {
  readonly page: Page;
  
  // Task board
  readonly tasksBoard: Locator;
  readonly errorMessage: Locator;
  readonly emptyState: Locator;
  readonly resetFiltersButton: Locator;
  readonly loadMoreButton: Locator;
  
  // Task form
  readonly taskForm: Locator;
  readonly formErrorMessage: Locator;
  readonly titleInput: Locator;
  readonly dueDateInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly deleteButton: Locator;
  
  // Delete confirmation dialog
  readonly deleteDialog: Locator;
  readonly deleteCancelButton: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Use data-test-id attributes for stable selectors
    this.tasksBoard = page.getByTestId('tasks-board');
    this.errorMessage = page.getByTestId('tasks-error-message');
    this.emptyState = page.getByTestId('tasks-empty-state');
    this.resetFiltersButton = page.getByTestId('tasks-reset-filters-button');
    this.loadMoreButton = page.getByTestId('tasks-load-more-button');
    
    // Task form
    this.taskForm = page.getByTestId('task-form');
    this.formErrorMessage = page.getByTestId('task-form-error-message');
    this.titleInput = page.getByTestId('task-form-title-input');
    this.dueDateInput = page.getByTestId('task-form-due-date-input');
    this.descriptionInput = page.getByTestId('task-form-description-input');
    this.submitButton = page.getByTestId('task-form-submit-button');
    this.deleteButton = page.getByTestId('task-form-delete-button');
    
    // Delete dialog
    this.deleteDialog = page.getByTestId('task-delete-dialog');
    this.deleteCancelButton = page.getByTestId('task-delete-cancel-button');
    this.deleteConfirmButton = page.getByTestId('task-delete-confirm-button');
  }

  /**
   * Navigate to tasks page for a specific group
   */
  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}/tasks`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Wait longer for board to render
  }

  /**
   * Navigate to specific task details
   */
  async gotoTask(groupId: string, taskId: string) {
    await this.page.goto(`/groups/${groupId}/tasks/${taskId}`);
  }

  /**
   * Fill task form with provided data
   */
  async fillTaskForm(data: TaskData) {
    await this.titleInput.fill(data.title);
    
    if (data.dueDate) {
      await this.dueDateInput.fill(data.dueDate);
    }
    
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
  }

  /**
   * Create a new task
   */
  async createTask(data: TaskData) {
    await this.fillTaskForm(data);
    await this.submitButton.click();
  }

  /**
   * Edit an existing task
   */
  async editTask(taskId: string, data: TaskData) {
    // Assumes we're already on the task page
    await this.fillTaskForm(data);
    await this.submitButton.click();
  }

  /**
   * Delete a task with confirmation
   */
  async deleteTask() {
    await this.deleteButton.click();
    await this.deleteDialog.waitFor({ state: 'visible' });
    await this.deleteConfirmButton.click();
  }

  /**
   * Cancel task deletion
   */
  async cancelDelete() {
    await this.deleteButton.click();
    await this.deleteDialog.waitFor({ state: 'visible' });
    await this.deleteCancelButton.click();
  }

  /**
   * Change task status by clicking on status selector
   */
  async changeStatus(taskId: string, status: string) {
    // This depends on how status change is implemented in UI
    const statusSelector = this.page.locator(`[data-task-id="${taskId}"] [data-status-select]`);
    await statusSelector.selectOption(status);
  }

  /**
   * Filter tasks by status
   */
  async filterByStatus(status: string) {
    // Depends on filter implementation
    const statusFilter = this.page.locator('[data-status-filter]');
    await statusFilter.selectOption(status);
  }

  /**
   * Reset all filters
   */
  async resetFilters() {
    await this.resetFiltersButton.click();
  }

  /**
   * Load more tasks
   */
  async loadMore() {
    await this.loadMoreButton.click();
  }

  /**
   * Click on a task card to view details
   */
  async openTask(index: number) {
    const taskCards = this.page.locator('[data-task-card]');
    await taskCards.nth(index).click();
  }

  /**
   * Click on a task by title
   */
  async openTaskByTitle(title: string) {
    await this.page.getByRole('link', { name: title }).click();
  }

  /**
   * Get count of displayed tasks
   */
  async getTaskCount(): Promise<number> {
    const taskCards = this.page.locator('[data-task-card]');
    return await taskCards.count();
  }

  /**
   * Check if tasks board is visible
   */
  async hasTasksBoard(): Promise<boolean> {
    return await this.tasksBoard.isVisible();
  }

  /**
   * Check if empty state is visible
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Get form error message text
   */
  async getFormErrorMessage(): Promise<string> {
    return await this.formErrorMessage.textContent() || '';
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Check if form error message is visible
   */
  async hasFormError(): Promise<boolean> {
    return await this.formErrorMessage.isVisible();
  }

  /**
   * Wait for tasks to load
   */
  async waitForLoad() {
    await this.tasksBoard.waitFor({ state: 'visible' });
  }

  /**
   * Check if task form is visible
   */
  async hasTaskForm(): Promise<boolean> {
    return await this.taskForm.isVisible();
  }
}

