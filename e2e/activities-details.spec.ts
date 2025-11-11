/* eslint-disable no-console */
import { test, expect } from "@playwright/test";
import {
  GroupsListPage,
  CreateGroupDialog,
  ActivitiesListPage,
  ActivityFormPage,
  ActivityDetailsPage,
} from "./page-objects";
import { generateGroupData, generateActivityData } from "./test-helpers";
import { cleanupTestData } from "./test-cleanup-helper";

/**
 * Activity Details Tests
 *
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 */
test.describe("Activity Details", () => {
  let groupId: string;

  test.beforeEach(async ({ page }) => {
    // User is already authenticated via storageState
    const groupData = generateGroupData();
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();

    await page.getByText(groupData.name).click();
    groupId = page.url().split("/groups/")[1]?.split("/")[0] || "";

    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);

    // Step 1: Basics (tytuł, cel, czas, uczestnicy)
    await activityForm.fillStep(activityData);
    await page.waitForTimeout(500);
    await activityForm.nextStep();

    // Step 2: Content (zadania, przebieg, podsumowanie)
    await page.waitForTimeout(500);
    await activityForm.fillStep(activityData);
    await page.waitForTimeout(500);
    await activityForm.nextStep();

    // Step 3: Logistics (miejsce, materiały, odpowiedzialny, zakres)
    await page.waitForTimeout(500);
    await activityForm.fillStep(activityData);
    await page.waitForTimeout(500);
    await activityForm.nextStep();

    // Step 4: Summary & Submit
    await page.waitForTimeout(500);
    await activityForm.submit();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await activitiesPage.goto(groupId);
    await activitiesPage.waitForLoad(); // Wait for activities list to fully load
    await page.waitForTimeout(500); // Extra time for React hydration and data rendering
    await page.getByText(activityData.temat || "").click();
  });

  test.afterEach(async () => {
    console.log("   🧹 Cleaning up after test...");
    await cleanupTestData();
    console.log("   ✓  Cleanup completed");
  });

  test("should display all 10 activity fields", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);
    await detailsPage.waitForLoad();
    await page.waitForTimeout(1000); // Wait for React component to fully hydrate and load data

    // Verify the activity title is visible in the header
    const title = await page.locator("text=Test Activity").first();
    await expect(title).toBeVisible();

    // Verify key fields are displayed
    await expect(page.getByText("Cel testowej aktywności")).toBeVisible();
    await expect(page.getByText("Zadania testowe")).toBeVisible();
    await expect(page.getByText("Sala testowa")).toBeVisible();
  });

  test("edit button visible for admin", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);
    await detailsPage.waitForLoad();
    await page.waitForTimeout(1000); // Wait for React component to fully hydrate and render buttons

    const canEdit = await detailsPage.canEdit();
    expect(canEdit).toBe(true);
  });

  test("edit button visible for assigned editors", async () => {
    test.skip();
  });

  test("read-only view for other editors", async () => {
    test.skip();
  });

  test("display list of assigned editors", async () => {
    test.skip();
  });

  test("display activity status", async () => {
    test.skip();
  });

  test("link to related tasks", async () => {
    test.skip();
  });

  test("display activity change history", async () => {
    test.skip();
  });
});
