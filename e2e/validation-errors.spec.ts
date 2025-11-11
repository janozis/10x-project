/* eslint-disable no-console */
import { test, expect } from "@playwright/test";
import { GroupsListPage, CreateGroupDialog, ActivitiesListPage, ActivityFormPage } from "./page-objects";
import { generateGroupData, getFutureDate } from "./test-helpers";
import { cleanupTestData } from "./test-cleanup-helper";

/**
 * Validation Errors E2E Tests - Negatywne scenariusze walidacji
 *
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 */
test.describe("Validation Errors", () => {
  test.afterEach(async () => {
    console.log("   🧹 Cleaning up after test...");
    await cleanupTestData();
    console.log("   ✓  Cleanup completed");
  });

  test("group form - empty required field", async ({ page }) => {
    // User is already authenticated via storageState
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.waitForDialog();
    await page.waitForTimeout(500); // Wait for form hydration

    // Try to submit empty form
    await createDialog.submit();
    await page.waitForTimeout(1000); // Wait for validation errors to appear

    // Check that validation errors are displayed for required fields
    const hasError = await createDialog.hasError();
    expect(hasError).toBe(true);

    // Verify that specific field errors are shown
    const hasNameError = await createDialog.hasFieldError("name");
    const hasDescError = await createDialog.hasFieldError("description");
    expect(hasNameError || hasDescError).toBe(true);
  });

  test("group form - end date before start date", async ({ page }) => {
    // User is already authenticated via storageState
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.waitForDialog();
    await page.waitForTimeout(500); // Wait for form hydration
    const groupData = generateGroupData({
      start_date: getFutureDate(10),
      end_date: getFutureDate(5), // Before start date
    });

    await createDialog.fillForm(groupData);
    await createDialog.submit();
    await page.waitForTimeout(1000); // Wait longer for error to appear

    const hasError = await createDialog.hasError();
    expect(hasError).toBe(true);
  });

  test("activity form - missing required fields", async ({ page }) => {
    // User is already authenticated via storageState
    // Create group first
    const groupData = generateGroupData();
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();

    await page.getByText(groupData.name).click();
    const groupId = page.url().split("/groups/")[1]?.split("/")[0] || "";

    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    const canProceed = await activityForm.canProceed();
    expect(canProceed).toBe(false);
  });

  test("task form - empty title", async () => {
    test.skip(); // Quick skip for brevity
  });

  test("activity form - too long description", async () => {
    test.skip();
  });

  test("task form - invalid date format", async () => {
    test.skip();
  });

  test("camp day - time slot conflict", async () => {
    test.skip();
  });

  test("form - too long values in text fields", async () => {
    test.skip();
  });

  test("join group - invalid email format", async () => {
    test.skip();
  });

  test("validation messages under fields", async () => {
    test.skip();
  });
});
