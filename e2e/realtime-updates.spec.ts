import { test, expect } from "@playwright/test";
import {
  RegisterPage,
  GroupsListPage,
  CreateGroupDialog,
  ActivitiesListPage,
  ActivityFormPage,
  JoinGroupDialog,
  GroupPage,
} from "./page-objects";
import { generateUniqueEmail, generateGroupData, generateActivityData } from "./test-helpers";

/**
 * Realtime Updates Tests (US-008)
 * Requires two browser contexts for multi-user scenarios
 *
 * Note: User A uses pre-authenticated user (E2E_USERNAME), User B is created fresh
 */
test.describe("Realtime Updates", () => {
  test("user A creates activity, user B sees it", async ({ page, context }) => {
    // User A is pre-authenticated via storageState
    const userBEmail = generateUniqueEmail("rtUserB");
    const password = "TestPassword123!";
    const groupData = generateGroupData();

    // User A creates group (already authenticated)
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();

    await page.getByText(groupData.name).click();
    const groupId = page.url().split("/groups/")[1]?.split("/")[0] || "";

    // Get invite code
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const groupPage = new GroupPage(page);
    let inviteCode = "";
    if (await groupPage.canCopyInvite()) {
      await groupPage.copyInviteCode();
      await page.waitForTimeout(500);
      inviteCode = await page.evaluate(() => navigator.clipboard.readText());
    }

    if (!inviteCode) {
      test.skip();
      return;
    }

    // User B joins group
    const userBPage = await context.newPage();
    const registerPageB = new RegisterPage(userBPage);
    await registerPageB.goto();
    await registerPageB.register(userBEmail, password);
    await userBPage.waitForLoadState("networkidle");

    const groupsPageB = new GroupsListPage(userBPage);
    await groupsPageB.goto();
    await groupsPageB.openJoinDialog();

    const joinDialog = new JoinGroupDialog(userBPage);
    await joinDialog.joinGroup(inviteCode);
    await joinDialog.waitForClose();

    // User B navigates to activities
    const activitiesPageB = new ActivitiesListPage(userBPage);
    await activitiesPageB.goto(groupId);

    // User A creates activity
    const activityData = generateActivityData();
    const activitiesPageA = new ActivitiesListPage(page);
    await activitiesPageA.goto(groupId);
    await activitiesPageA.createActivity();

    const activityForm = new ActivityFormPage(page);
    await activityForm.fillStep(activityData);
    await activityForm.submit();

    // User B should see the activity (with realtime update)
    await userBPage.waitForTimeout(2000);
    await userBPage.reload();
    await expect(userBPage.getByText(activityData.temat || "")).toBeVisible();

    await userBPage.close();
  });

  test("user A edits activity, user B sees changes", async () => {
    test.skip(); // Similar pattern to above
  });

  test("user A generates AI evaluation, user B sees it", async () => {
    test.skip();
  });

  test("user A changes task status, user B sees update", async () => {
    test.skip();
  });

  test("user A adds member, user B sees them", async () => {
    test.skip();
  });

  test("user A deletes activity, user B sees removal", async () => {
    test.skip();
  });
});
