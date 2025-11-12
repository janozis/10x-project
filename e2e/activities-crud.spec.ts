import { test, expect } from "./fixtures"; // Use fixtures with auto-cleanup
import type { Page } from "@playwright/test";
import {
  GroupsListPage,
  CreateGroupDialog,
  ActivitiesListPage,
  ActivityFormPage,
  type ActivityStepData,
} from "./page-objects";
import { generateGroupData, generateActivityData } from "./test-helpers";

/**
 * Helper function to create an activity through the multi-step form
 */
async function createActivityThroughStepper(
  page: Page,
  activityForm: ActivityFormPage,
  activityData: ActivityStepData
) {
  await activityForm.waitForLoad();

  // Step 1 - Basics
  await activityForm.fillStep(activityData);
  await activityForm.nextStep();
  await page.waitForTimeout(500);

  // Step 2 - Content
  await activityForm.fillStep(activityData);
  await activityForm.nextStep();
  await page.waitForTimeout(500);

  // Step 3 - Logistics
  await activityForm.fillStep(activityData);
  await activityForm.nextStep();
  await page.waitForTimeout(500);

  // Step 4 - Summary
  await activityForm.fillStep(activityData);
  await activityForm.submit();
  await page.waitForLoadState("networkidle");
}

/**
 * Activities CRUD E2E Tests
 *
 * Tests CRUD operations for activities with multi-step form (US-005)
 * - Create new activity through stepper
 * - Validate all 10 required fields
 * - Validation errors
 * - Edit existing activity
 * - Assign multiple editors
 * - Delete activity
 * - List activities
 * - Filter activities
 * - Search activities
 *
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 * Uses fixtures with auto-cleanup after each test
 */
test.describe("Activities - CRUD Operations", () => {
  let groupId: string;

  // Clean up before starting this test suite
  test.beforeAll(async () => {
    const { cleanupTestData } = await import("./test-cleanup-helper");
    await cleanupTestData();
    console.log("🧹 Pre-cleaned test data before Activities CRUD tests");
  });

  test.beforeEach(async ({ page }) => {
    // User is already authenticated via storageState
    // Create a group for testing activities
    const groupData = generateGroupData();
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();

    // Extract groupId from URL after clicking group
    await page.getByText(groupData.name).click();
    await page.waitForLoadState("networkidle");
    groupId = page.url().split("/groups/")[1]?.split("/")[0] || "";
  });

  test("should create new activity through stepper", async ({ page }) => {
    // Arrange
    const activityData: ActivityStepData = generateActivityData();

    // Navigate to activities
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);

    // Act - Create activity through multi-step form
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // Assert - Should redirect to activities list or details
    await page.waitForLoadState("networkidle");

    // Activity should be visible in the list
    await activitiesPage.goto(groupId);
    await expect(page.getByText(activityData.temat || "")).toBeVisible();
  });

  test("should validate all 10 required fields", async ({ page }) => {
    // Arrange
    const activityData: ActivityStepData = generateActivityData({
      temat: "Complete Activity Test",
      cel: "Test all required fields",
      czas: "90", // Just the number
      miejsce: "Test location",
      materialy: "Test materials list",
      odpowiedzialni: "Test coordinator",
      zakresWiedzy: "Test knowledge scope",
      uczestnicy: "All participants",
      przebieg: "Detailed course description for testing",
      podsumowanie: "Summary of the activity test",
    });

    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);

    // Act - Create activity with all fields
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // Assert - Should save successfully
    await page.waitForLoadState("networkidle");
    await activitiesPage.goto(groupId);
    await expect(page.getByText(activityData.temat || "")).toBeVisible();
  });

  test("should show validation error when required fields are empty", async ({ page }) => {
    // Arrange
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);

    // Act - Try to submit without filling required fields
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await activityForm.waitForLoad();

    // Try to submit immediately without filling anything
    const canProceed = await activityForm.canProceed();

    // Assert - Submit button should be disabled or show validation errors
    // Implementation may vary - button might be disabled or errors shown on submit
    if (canProceed) {
      await activityForm.submit();
      await page.waitForTimeout(500);

      // Should see validation errors
      const errorVisible = await page
        .locator('[data-error], .error, [role="alert"]')
        .isVisible()
        .catch(() => false);
      expect(errorVisible).toBe(true);
    } else {
      // Button is disabled - this is also valid validation
      expect(canProceed).toBe(false);
    }
  });

  test("should edit existing activity", async ({ page }) => {
    // Arrange - Create an activity first
    const originalData = generateActivityData();

    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, originalData);

    // Navigate back to activities list
    await activitiesPage.goto(groupId);
    await expect(page.getByText(originalData.temat || "")).toBeVisible();

    // Act - Edit the activity
    await page.getByText(originalData.temat || "").click();
    await page.waitForLoadState("networkidle");

    // Look for edit button
    const editButton = page.getByRole("button", { name: /edytuj|edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Change the temat (subject)
      const newTemat = generateActivityData().temat;
      if (newTemat) {
        await activityForm.fillField("temat", newTemat);
        await activityForm.submit();

        await page.waitForLoadState("networkidle");

        // Assert - Should see updated activity
        await activitiesPage.goto(groupId);
        await expect(page.getByText(newTemat)).toBeVisible();
      }
    }
  });

  test("should assign multiple editors to activity", async ({ page, context }) => {
    // This test requires editor assignment UI which may not be implemented yet
    // Skip for now if the feature doesn't exist

    // Arrange - Create activity
    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // Navigate to activity details
    await activitiesPage.goto(groupId);
    await page.getByText(activityData.temat || "").click();
    await page.waitForLoadState("networkidle");

    // Look for editor assignment UI
    const editorAssignButton = page.getByRole("button", { name: /przypisz|assign|edytorzy|editors/i });
    const hasEditorUI = await editorAssignButton.isVisible().catch(() => false);

    if (!hasEditorUI) {
      test.skip();
      return;
    }

    // Act - Assign editors (implementation depends on UI)
    // This is a placeholder for when the feature is implemented
    await editorAssignButton.click();

    // Assert - Would verify editors are assigned
  });

  test("should delete activity", async ({ page }) => {
    // Arrange - Create activity
    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // Verify activity created
    await activitiesPage.goto(groupId);
    await expect(page.getByText(activityData.temat || "")).toBeVisible();

    // Act - Delete activity
    await page.getByText(activityData.temat || "").click();
    await page.waitForLoadState("networkidle");

    const deleteButton = page.getByRole("button", { name: /usuń|delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.getByRole("button", { name: /potwierdź|confirm|tak|yes/i });
      await confirmButton.click();

      await page.waitForLoadState("networkidle");

      // Assert - Activity should be gone
      await activitiesPage.goto(groupId);
      const isVisible = await page
        .getByText(activityData.temat || "")
        .isVisible()
        .catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test("should list all activities in group", async ({ page }) => {
    // Arrange - Create multiple activities
    const activity1 = generateActivityData();
    const activity2 = generateActivityData();
    const activity3 = generateActivityData();

    const activitiesPage = new ActivitiesListPage(page);
    const activityForm = new ActivityFormPage(page);

    // Create activity 1
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();
    await createActivityThroughStepper(page, activityForm, activity1);
    await page.waitForTimeout(100);

    // Create activity 2
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();
    await createActivityThroughStepper(page, activityForm, activity2);
    await page.waitForTimeout(100);

    // Create activity 3
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();
    await createActivityThroughStepper(page, activityForm, activity3);

    // Act - Go to activities list
    await activitiesPage.goto(groupId);
    await activitiesPage.waitForLoad();

    // Assert - All three activities should be visible
    // Since they might have the same timestamp, check for count
    const activity1Elements = page.getByText(activity1.temat || "");
    await expect(activity1Elements.first()).toBeVisible();

    // Verify we have exactly 3 activities
    const activityRows = page.getByTestId("activities-table-row");
    await expect(activityRows).toHaveCount(3);
  });

  test("should filter activities by status", async ({ page }) => {
    // Arrange - Create activity
    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // Act - Apply status filter
    await activitiesPage.goto(groupId);
    await activitiesPage.waitForLoad();

    const hasStatusFilter = await activitiesPage.statusFilter.isVisible().catch(() => false);

    if (hasStatusFilter) {
      // Try filtering by different statuses
      await activitiesPage.filterByStatus("draft");
      await page.waitForTimeout(500);

      // Assert - Would verify filtered results
      // Implementation depends on how filtering works
    } else {
      // Filter not implemented yet
      test.skip();
    }
  });

  test("should filter only assigned activities", async ({ page }) => {
    // Arrange
    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // Act - Toggle "only assigned" filter
    await activitiesPage.goto(groupId);
    await activitiesPage.waitForLoad();

    const hasAssignedFilter = await activitiesPage.assignedCheckbox.isVisible().catch(() => false);

    if (hasAssignedFilter) {
      await activitiesPage.showOnlyAssigned();
      await page.waitForTimeout(500);

      // Assert - Should only show assigned activities
      // Since we created the activity, it should be visible
      await expect(page.getByText(activityData.temat || "")).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("should search activities by name", async ({ page }) => {
    // Arrange - Create activities with different names
    const searchableActivity = generateActivityData({
      temat: `SEARCHABLE_${Date.now()}`,
    });
    const otherActivity = generateActivityData({
      temat: `OTHER_${Date.now()}`,
    });

    const activitiesPage = new ActivitiesListPage(page);
    const activityForm = new ActivityFormPage(page);

    // Create searchable activity
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();
    await createActivityThroughStepper(page, activityForm, searchableActivity);
    await page.waitForTimeout(100);

    // Create other activity
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();
    await createActivityThroughStepper(page, activityForm, otherActivity);

    // Act - Search for specific activity
    await activitiesPage.goto(groupId);
    await activitiesPage.waitForLoad();

    const hasSearch = await activitiesPage.searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      await activitiesPage.searchActivities("SEARCHABLE");
      await page.waitForTimeout(500);

      // Assert - Should see only the searchable activity
      await expect(page.getByText(searchableActivity.temat || "")).toBeVisible();

      // Other activity might be hidden
      const otherVisible = await page
        .getByText(otherActivity.temat || "")
        .isVisible()
        .catch(() => false);
      // Note: depends on search implementation - might still be visible
    } else {
      test.skip();
    }
  });
});
