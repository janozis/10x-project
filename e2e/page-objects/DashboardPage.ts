import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Dashboard Page
 *
 * Represents the main dashboard after login
 */
export class DashboardPage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly userMenu: Locator;
  readonly groupsLink: Locator;
  readonly activitiesLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.navigation = page.locator("nav");
    this.userMenu = page.getByTestId("user-menu");
    this.groupsLink = page.getByRole("link", { name: /grupy|groups/i });
    this.activitiesLink = page.getByRole("link", { name: /aktywności|activities/i });
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.navigation.isVisible();
  }

  /**
   * Navigate to groups page
   */
  async goToGroups() {
    await this.groupsLink.click();
  }

  /**
   * Navigate to activities page
   */
  async goToActivities() {
    await this.activitiesLink.click();
  }
}
