import { Page, Locator } from '@playwright/test';

export class GroupsListPage {
  readonly page: Page;
  readonly createGroupButton: Locator;
  readonly emptyStateMessage: Locator;
  readonly errorMessage: Locator;
  readonly groupCards: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createGroupButton = page.getByRole('button', { name: /utwórz grupę/i });
    this.emptyStateMessage = page.getByRole('heading', { name: /brak grup/i });
    this.errorMessage = page.getByText(/wystąpił błąd podczas ładowania listy grup/i);
    this.groupCards = page.locator('[data-testid="group-card"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  async goto() {
    await this.page.goto('/groups');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getGroupCount(): Promise<number> {
    return await this.groupCards.count();
  }

  async clickGroupByName(name: string) {
    await this.page.getByRole('link', { name }).click();
  }
}

