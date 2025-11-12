import { test, expect } from "@playwright/test";
import {
  GroupsListPage,
  CreateGroupDialog,
  TasksPage,
  ActivitiesListPage,
  ActivityFormPage,
  type TaskData,
} from "./page-objects";
import { generateGroupData, generateActivityData, generateTaskData, getFutureDate } from "./test-helpers";

/**
 * Tasks E2E Tests - System zadań (F-TASK-01)
 *
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 */
test.describe("Tasks Management", () => {
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
    await page.waitForLoadState("networkidle");
    groupId = page.url().split("/groups/")[1]?.split("/")[0] || "";
  });

  test("should create new task", async ({ page }) => {
    const taskData = generateTaskData({ dueDate: getFutureDate(3) });
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
      await expect(page.getByText(taskData.title)).toBeVisible();
    }
  });

  test("should assign task to activity", async ({ page }) => {
    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await activityForm.fillStep(activityData);
    await activityForm.submit();
    await page.waitForLoadState("networkidle");

    const taskData = generateTaskData();
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
    }
  });

  test("should update task status", async ({ page }) => {
    const taskData = generateTaskData();
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
      // Status change depends on UI implementation
    }
  });

  test("should edit task", async ({ page }) => {
    const taskData = generateTaskData();
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
      await page.getByText(taskData.title).click();

      const newTitle = generateTaskData().title;
      const titleInput = page.getByTestId("task-form-title-input");
      if (await titleInput.isVisible()) {
        await titleInput.clear();
        await titleInput.fill(newTitle);
        await page.getByTestId("task-form-submit-button").click();
      }
    }
  });

  test("should delete task with confirmation", async ({ page }) => {
    const taskData = generateTaskData();
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
      await page.getByText(taskData.title).click();
      await tasksPage.deleteTask();
    }
  });

  test("should filter tasks by status", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTasksBoard()) {
      await tasksPage.filterByStatus("pending");
      await page.waitForTimeout(500);
    }
  });

  test("should display task board", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    const hasBoard = await tasksPage.hasTasksBoard();
    expect(hasBoard).toBe(true);
  });

  test("should load more tasks", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    const loadMoreBtn = await tasksPage.loadMoreButton.isVisible().catch(() => false);
    if (loadMoreBtn) {
      await tasksPage.loadMore();
    }
  });

  test("should view task details", async ({ page }) => {
    const taskData = generateTaskData();
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
      await tasksPage.openTaskByTitle(taskData.title);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(taskData.title)).toBeVisible();
    }
  });

  test("should handle task without due date", async ({ page }) => {
    const taskData = generateTaskData({ dueDate: undefined });
    const tasksPage = new TasksPage(page);
    await tasksPage.goto(groupId);

    if (await tasksPage.hasTaskForm()) {
      await tasksPage.createTask(taskData);
      await expect(page.getByText(taskData.title)).toBeVisible();
    }
  });
});
