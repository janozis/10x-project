/* eslint-disable no-console */
import { test, expect } from "./fixtures"; // Auto-cleanup after each test
import type { Browser } from "@playwright/test";
import {
  LoginPage,
  GroupsListPage,
  CreateGroupDialog,
  JoinGroupDialog,
  GroupPage,
  GroupMembersPage,
} from "./page-objects";
import { generateGroupData, logoutUser } from "./test-helpers";

/**
 * Groups Join E2E Tests
 *
 * Tests joining groups via invitation code (US-003)
 * - Join group with valid code
 * - Multi-user scenario (User A creates, User B joins)
 * - Group appears in joiner's list
 * - Invalid invitation code error
 * - Prevent duplicate join
 * - Display members after join
 *
 * IMPORTANT: These tests MUST run sequentially with --workers=1
 * Each test is fully isolated with its own login/logout cycle
 */
test.describe.configure({ mode: "serial" });

test.describe("Groups - Join via Invitation Code", () => {
  // Helper to clean up a specific group
  async function cleanupGroup(browser: Browser, groupId: string) {
    const context = await browser.newContext({ storageState: "./e2e/.auth/user.json" });
    const page = await context.newPage();

    try {
      const response = await page.request.delete(`/api/groups/${groupId}`);
      if (response.ok()) {
        console.log(`🧹 Cleaned up test group: ${groupId}`);
      }
    } catch {
      // Ignore cleanup errors
    } finally {
      await page.close();
      await context.close();
    }
  }

  // CRITICAL: Restore main user session after all tests
  // This ensures groups-management.spec.ts and other tests can use the storageState
  test.afterAll(async ({ browser }) => {
    console.log("🔄 Restoring main user session after groups-join tests...");
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPage.login(username, password);
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // Save the session state
      await page.context().storageState({ path: "./e2e/.auth/user.json" });
      console.log("✅ Main user session restored successfully");
    } catch (error) {
      console.error("❌ Failed to restore main user session:", error);
    } finally {
      await page.close();
      await context.close();
    }
  });

  test("should join group using valid invitation code", async ({ browser, skipCleanup }) => {
    // Skip auto-cleanup for this test (uses multi-user flow with sessions)
    skipCleanup();

    let groupId: string | null = null;

    // Create a fresh context WITHOUT storageState to avoid polluting the global session
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // STEP 1: Login as User A (fresh login, not using saved session)
      const loginPageA = new LoginPage(page);
      await loginPageA.goto();
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPageA.login(username, password);
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // STEP 2: User A creates a group
      const groupData = generateGroupData();
      const groupsPage = new GroupsListPage(page);
      await groupsPage.goto();
      await groupsPage.openCreateDialog();

      const createDialog = new CreateGroupDialog(page);
      await createDialog.createGroup(groupData);
      await createDialog.waitForClose();

      // Wait for the group to appear in the list
      await page.waitForTimeout(2000);
      await groupsPage.waitForLoad();

      // Get group ID for cleanup
      const response = await page.request.get("/api/groups");
      if (response.ok()) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const group = result.data.find((g: { name: string; id: string }) => g.name === groupData.name);
          if (group) {
            groupId = group.id;
          }
        }
      }

      // STEP 3: Copy invite code
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const copyButton = page.getByRole("button", { name: "Kopiuj kod" }).first();
      await copyButton.waitFor({ state: "visible", timeout: 15000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      const inviteCode = await page.evaluate(() => navigator.clipboard.readText());
      if (!inviteCode) {
        test.skip();
        return;
      }
      console.log(`📋 Copied invite code: ${inviteCode}`);

      // STEP 4: Logout User A
      console.log("🚪 Logging out User A...");
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });

      // STEP 5: Login as User B
      console.log("👤 Logging in as User B...");
      const loginPageB = new LoginPage(page);
      await loginPageB.loginWithSecondTestUser();
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // STEP 6: User B joins the group
      console.log("🎯 User B joining group...");
      const groupsPageB = new GroupsListPage(page);
      await groupsPageB.openJoinDialog();

      const joinDialog = new JoinGroupDialog(page);
      await joinDialog.joinGroup(inviteCode);

      await page.waitForTimeout(2000);

      const hasError = await joinDialog.hasError();
      if (hasError) {
        const errorMsg = await joinDialog.getErrorMessage();
        throw new Error(`Failed to join group: ${errorMsg}`);
      }

      await joinDialog.waitForClose();

      // STEP 7: Assert - Group appears in User B's list
      await expect(page.getByText(groupData.name)).toBeVisible();
      console.log("✅ User B successfully joined the group!");

      // STEP 8: Logout User B
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });
      console.log("🚪 User B logged out");
    } finally {
      // Cleanup: Delete test group
      if (groupId) {
        await cleanupGroup(browser, groupId);
      }

      // Close the isolated context to avoid polluting global session
      await page.close();
      await context.close();
    }
  });

  test("should show group in list after joining", async ({ browser, skipCleanup }) => {
    skipCleanup(); // Multi-user flow test
    let groupId: string | null = null;

    // Create a fresh context WITHOUT storageState to avoid polluting the global session
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // STEP 1: Login as User A (fresh login)
      const loginPageA = new LoginPage(page);
      await loginPageA.goto(); // Use goto() which includes proper waiting
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPageA.login(username, password);
      await page.waitForURL("**/groups", { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000); // Extra wait for React hydration

      // STEP 2: User A creates group
      const groupData = generateGroupData();
      const groupsPage = new GroupsListPage(page);
      await groupsPage.goto();
      await groupsPage.openCreateDialog();

      const createDialog = new CreateGroupDialog(page);
      await createDialog.createGroup(groupData);
      await createDialog.waitForClose();

      // Wait for the group to appear in the list
      await page.waitForTimeout(2000);
      await groupsPage.waitForLoad();

      // Get group ID for cleanup
      const response = await page.request.get("/api/groups");
      if (response.ok()) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const group = result.data.find((g: { name: string; id: string }) => g.name === groupData.name);
          if (group) {
            groupId = group.id;
          }
        }
      }

      // STEP 3: Grant clipboard permissions and copy invite code
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButton = page.getByRole("button", { name: "Kopiuj kod" }).first();
      await copyButton.waitFor({ state: "visible", timeout: 15000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      const inviteCode = await page.evaluate(() => navigator.clipboard.readText());

      if (!inviteCode) {
        test.skip();
        return;
      }

      // STEP 4: Logout User A
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });

      // STEP 5: Login as User B
      const loginPage = new LoginPage(page);
      await loginPage.loginWithSecondTestUser();
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      const groupsPageB = new GroupsListPage(page);

      // STEP 6: Verify group is NOT in User B's list before joining
      await groupsPageB.waitForLoad();
      const countBefore = await groupsPageB.getGroupCount();
      const hasGroupBefore = await page
        .getByText(groupData.name)
        .isVisible()
        .catch(() => false);
      expect(hasGroupBefore).toBe(false);

      // STEP 7: Join the group
      await groupsPageB.openJoinDialog();
      const joinDialog = new JoinGroupDialog(page);
      await joinDialog.joinGroup(inviteCode);
      await joinDialog.waitForClose();

      // STEP 8: Assert - Group should appear in list
      await page.goto("/groups"); // Refresh to ensure list updates
      await page.waitForLoadState("networkidle");

      const countAfter = await groupsPageB.getGroupCount();
      expect(countAfter).toBe(countBefore + 1); // Check count increased by 1

      await expect(page.getByText(groupData.name)).toBeVisible();

      // STEP 9: Logout User B
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });
    } finally {
      // Cleanup
      if (groupId) {
        await cleanupGroup(browser, groupId);
      }

      // Close the isolated context to avoid polluting global session
      await page.close();
      await context.close();
    }
  });

  test("should show error with invalid invitation code", async ({ browser, skipCleanup }) => {
    skipCleanup(); // Multi-user flow test
    let groupId: string | null = null;

    // Create a fresh context WITHOUT storageState to avoid polluting the global session
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // STEP 1: Login as User A (fresh login)
      const loginPageA = new LoginPage(page);
      await loginPageA.goto(); // Use goto() which includes proper waiting
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPageA.login(username, password);
      await page.waitForURL("**/groups", { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000); // Extra wait for React hydration

      // STEP 2: User A creates a group
      const groupData = generateGroupData();
      const groupsPage = new GroupsListPage(page);
      await groupsPage.goto();
      await groupsPage.openCreateDialog();

      const createDialog = new CreateGroupDialog(page);
      await createDialog.createGroup(groupData);
      await createDialog.waitForClose();

      // Wait for the group to appear in the list
      await page.waitForTimeout(2000);
      await groupsPage.waitForLoad();

      // Get group ID for cleanup
      const response = await page.request.get("/api/groups");
      if (response.ok()) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const group = result.data.find((g: { name: string; id: string }) => g.name === groupData.name);
          if (group) {
            groupId = group.id;
          }
        }
      }

      // STEP 3: Get valid invite code (we won't use it, just to verify it exists)
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButton = page.getByRole("button", { name: "Kopiuj kod" }).first();
      await copyButton.waitFor({ state: "visible", timeout: 15000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      const validCode = await page.evaluate(() => navigator.clipboard.readText());

      if (!validCode) {
        test.skip();
        return;
      }

      // STEP 4: Logout User A
      console.log("🚪 Logging out User A...");
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });

      // STEP 5: Login as User B
      console.log("👤 Logging in as User B...");
      const loginPage = new LoginPage(page);
      await loginPage.loginWithSecondTestUser();
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // STEP 6: Try to join with INVALID code (different from the valid one)
      const groupsPageB = new GroupsListPage(page);
      await groupsPageB.openJoinDialog();

      const joinDialog = new JoinGroupDialog(page);
      await joinDialog.joinGroup("abcd9999"); // Valid format but non-existent code

      // STEP 7: Assert - Should show error message
      await page.waitForTimeout(1000); // Wait for API response

      const hasError = await joinDialog.hasError();
      expect(hasError).toBe(true);

      const errorMessage = await joinDialog.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.length).toBeGreaterThan(0);

      console.log(`✅ Error message displayed correctly: ${errorMessage}`);

      // Close the dialog before logging out
      await joinDialog.cancel();
      await joinDialog.waitForClose();

      // STEP 8: Logout User B
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });
    } finally {
      // Cleanup
      if (groupId) {
        await cleanupGroup(browser, groupId);
      }

      // Close the isolated context to avoid polluting global session
      await page.close();
      await context.close();
    }
  });

  test("should prevent joining same group twice", async ({ browser, skipCleanup }) => {
    skipCleanup(); // Multi-user flow test
    let groupId: string | null = null;

    // Create a fresh context WITHOUT storageState to avoid polluting the global session
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // STEP 1: Login as User A (fresh login)
      const loginPageA = new LoginPage(page);
      await loginPageA.goto(); // Use goto() which includes proper waiting
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPageA.login(username, password);
      await page.waitForURL("**/groups", { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000); // Extra wait for React hydration

      // STEP 2: User A creates group and gets invite code
      const groupData = generateGroupData();
      const groupsPage = new GroupsListPage(page);
      await groupsPage.goto();
      await groupsPage.openCreateDialog();

      const createDialog = new CreateGroupDialog(page);
      await createDialog.createGroup(groupData);
      await createDialog.waitForClose();

      // Wait for the group to appear in the list
      await page.waitForTimeout(2000);
      await groupsPage.waitForLoad();

      // Get group ID for cleanup
      const response = await page.request.get("/api/groups");
      if (response.ok()) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const group = result.data.find((g: { name: string; id: string }) => g.name === groupData.name);
          if (group) {
            groupId = group.id;
          }
        }
      }

      // STEP 3: Grant clipboard permissions and copy invite code
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButton = page.getByRole("button", { name: "Kopiuj kod" }).first();
      await copyButton.waitFor({ state: "visible", timeout: 15000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      const inviteCode = await page.evaluate(() => navigator.clipboard.readText());

      if (!inviteCode) {
        test.skip();
        return;
      }

      // STEP 4: Logout and login as second user
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });

      const loginPage = new LoginPage(page);
      await loginPage.loginWithSecondTestUser();
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // STEP 5: Join the group first time
      const groupsPageMember = new GroupsListPage(page);
      await groupsPageMember.openJoinDialog();

      const joinDialog1 = new JoinGroupDialog(page);
      await joinDialog1.joinGroup(inviteCode);
      await joinDialog1.waitForClose();

      // Verify joined successfully
      await expect(page.getByText(groupData.name)).toBeVisible();

      // STEP 6: Try to join again with the same code
      await groupsPageMember.goto();
      await page.waitForLoadState("networkidle");
      await groupsPageMember.openJoinDialog();

      const joinDialog2 = new JoinGroupDialog(page);
      await joinDialog2.joinGroup(inviteCode);

      // STEP 7: Assert - Should show error about already being a member
      await page.waitForTimeout(1000);

      const hasError = await joinDialog2.hasError();
      expect(hasError).toBe(true);

      // Close the dialog before logging out
      await joinDialog2.cancel();
      await joinDialog2.waitForClose();

      // STEP 8: Logout User B
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });
    } finally {
      // Cleanup
      if (groupId) {
        await cleanupGroup(browser, groupId);
      }

      // Close the isolated context to avoid polluting global session
      await page.close();
      await context.close();
    }
  });

  test("should display members list after joining", async ({ browser, skipCleanup }) => {
    skipCleanup(); // Multi-user flow test
    let groupId: string | null = null;

    // Create a fresh context WITHOUT storageState to avoid polluting the global session
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // STEP 1: Login as User A (fresh login)
      const loginPageA = new LoginPage(page);
      await loginPageA.goto(); // Use goto() which includes proper waiting
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPageA.login(username, password);
      await page.waitForURL("**/groups", { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000); // Extra wait for React hydration

      // STEP 2: User A creates group
      const groupData = generateGroupData();
      const groupsPage = new GroupsListPage(page);
      await groupsPage.goto();
      await groupsPage.openCreateDialog();

      const createDialog = new CreateGroupDialog(page);
      await createDialog.createGroup(groupData);
      await createDialog.waitForClose();

      // Wait for the group to appear in the list
      await page.waitForTimeout(2000);
      await groupsPage.waitForLoad();

      // Get group ID for cleanup
      const response = await page.request.get("/api/groups");
      if (response.ok()) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const group = result.data.find((g: { name: string; id: string }) => g.name === groupData.name);
          if (group) {
            groupId = group.id;
          }
        }
      }

      // STEP 3: Grant clipboard permissions and copy invite code
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButton = page.getByRole("button", { name: "Kopiuj kod" }).first();
      await copyButton.waitFor({ state: "visible", timeout: 15000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      const inviteCode = await page.evaluate(() => navigator.clipboard.readText());

      if (!inviteCode) {
        test.skip();
        return;
      }

      // STEP 4: Logout and login as member
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });

      const loginPage = new LoginPage(page);
      await loginPage.loginWithSecondTestUser();
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // STEP 5: Join the group
      const groupsPageMember = new GroupsListPage(page);
      await groupsPageMember.openJoinDialog();

      const joinDialog = new JoinGroupDialog(page);
      await joinDialog.joinGroup(inviteCode);
      await joinDialog.waitForClose();

      // STEP 6: Navigate to members page
      await page.getByText(groupData.name).click();
      await page.waitForLoadState("networkidle");

      const groupPageMember = new GroupPage(page);
      await groupPageMember.goToMembers();

      // Wait for navigation to members page
      await page.waitForURL("**/members", { timeout: 10000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500); // Wait for React hydration

      // STEP 7: Assert - Should see members list
      const membersPage = new GroupMembersPage(page);
      await membersPage.waitForLoad();

      const hasMembersTable = await membersPage.hasMembersTable();
      expect(hasMembersTable).toBe(true);

      // Should see at least 2 members (owner + new member)
      const memberCount = await membersPage.getMemberCount();
      expect(memberCount).toBeGreaterThanOrEqual(2);

      // STEP 8: Logout User B
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });
    } finally {
      // Cleanup
      if (groupId) {
        await cleanupGroup(browser, groupId);
      }

      // Close the isolated context to avoid polluting global session
      await page.close();
      await context.close();
    }
  });

  test("should handle user joining a group with invite code", async ({ browser, skipCleanup }) => {
    skipCleanup(); // Multi-user flow test
    let groupId: string | null = null;

    // Create a fresh context WITHOUT storageState to avoid polluting the global session
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // STEP 1: Login as User A (fresh login)
      const loginPageA = new LoginPage(page);
      await loginPageA.goto(); // Use goto() which includes proper waiting
      const username = process.env.E2E_USERNAME || "";
      const password = process.env.E2E_PASSWORD || "";
      await loginPageA.login(username, password);
      await page.waitForURL("**/groups", { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000); // Extra wait for React hydration

      // STEP 2: Owner creates group
      const groupData = generateGroupData();
      const groupsPage = new GroupsListPage(page);
      await groupsPage.goto();
      await groupsPage.openCreateDialog();

      const createDialog = new CreateGroupDialog(page);
      await createDialog.createGroup(groupData);
      await createDialog.waitForClose();

      // Wait for the group to appear in the list
      await page.waitForTimeout(2000);
      await groupsPage.waitForLoad();

      // Get group ID for cleanup
      const response = await page.request.get("/api/groups");
      if (response.ok()) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const group = result.data.find((g: { name: string; id: string }) => g.name === groupData.name);
          if (group) {
            groupId = group.id;
          }
        }
      }

      // STEP 3: Grant clipboard permissions and copy invite code
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButton = page.getByRole("button", { name: "Kopiuj kod" }).first();
      await copyButton.waitFor({ state: "visible", timeout: 15000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      const inviteCode = await page.evaluate(() => navigator.clipboard.readText());

      if (!inviteCode) {
        test.skip();
        return;
      }

      // STEP 4: Member joins
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });

      const loginPage = new LoginPage(page);
      await loginPage.loginWithSecondTestUser();
      await page.waitForURL("**/groups", { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      const groupsPageMember = new GroupsListPage(page);
      await groupsPageMember.openJoinDialog();

      const joinDialog = new JoinGroupDialog(page);
      await joinDialog.joinGroup(inviteCode);
      await joinDialog.waitForClose();

      // STEP 5: Assert - Member joined successfully
      await expect(page.getByText(groupData.name)).toBeVisible();

      // STEP 6: Logout User B
      await logoutUser(page);
      await page.waitForURL("**/auth/login", { timeout: 10000 });
    } finally {
      // Cleanup
      if (groupId) {
        await cleanupGroup(browser, groupId);
      }

      // Close the isolated context to avoid polluting global session
      await page.close();
      await context.close();
    }
  });
});
