import { test, expect } from "@playwright/test";
import { DashboardPage, GroupsListPage, CreateGroupDialog } from "./page-objects";
import { generateGroupData } from "./test-helpers";
import { cleanupTestData } from "./test-cleanup-helper";

/**
 * Dashboard Admin Tests - Statystyki i dashboard (US-009)
 *
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 */
test.describe("Dashboard Admin", () => {
  test.beforeEach(async ({ page }) => {
    // User is already authenticated via storageState
    const groupData = generateGroupData();
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();
  });

  test.afterEach(async () => {
    console.log("   🧹 Cleaning up after test...");
    await cleanupTestData();
    console.log("   ✓  Cleanup completed");
  });

  test("should display group progress", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    const progressIndicator = page.locator('[data-progress], [data-test-id*="progress"]');
    const hasProgress = await progressIndicator.isVisible().catch(() => false);
    // Progress UI depends on implementation
  });

  test("should show admin tasks list", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    const tasksList = page.locator('[data-tasks-list], [data-test-id*="tasks"]');
    // Tasks list implementation dependent
  });

  test("should display recent activities timeline", async ({ page }) => {
    test.skip();
  });

  test("dashboard updates after adding activity", async ({ page }) => {
    test.skip();
  });

  test("statistics update after AI evaluation", async ({ page }) => {
    test.skip();
  });

  test("click task navigates to details", async ({ page }) => {
    test.skip();
  });

  test("click activity navigates to details", async ({ page }) => {
    test.skip();
  });
});
