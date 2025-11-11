/* eslint-disable no-console */
import { test, expect } from "./fixtures"; // Import from fixtures for auto-cleanup
import { GroupsListPage, CreateGroupDialog } from "./page-objects";
import { generateGroupData } from "./test-helpers";

/**
 * Teardown Verification Test
 *
 * This test creates test data and verifies it exists.
 * After all tests complete, global teardown should clean this data.
 *
 * To verify teardown works:
 * 1. Run this test: npx playwright test teardown-verification.spec.ts
 * 2. Check database - groups should exist
 * 3. Wait for teardown to complete
 * 4. Check database again - groups should be gone
 */

test.describe("Teardown Verification", () => {
  test("creates test data that should be cleaned by teardown", async ({ page }) => {
    // Arrange
    const groupsPage = new GroupsListPage(page);
    const createDialog = new CreateGroupDialog(page);
    const groupData = generateGroupData({
      name: `[TEARDOWN-TEST] ${new Date().toISOString()}`,
      description: "This group should be automatically deleted by teardown",
    });

    // Act - Navigate to groups page
    await page.goto("/groups");
    await groupsPage.waitForLoad();

    // Create a test group
    await groupsPage.openCreateDialog();
    await createDialog.fillForm(groupData);
    await createDialog.submit();
    await createDialog.waitForClose();

    // Assert - Verify the group was created
    await expect(page.getByText(groupData.name)).toBeVisible();

    console.log("✓ Test group created:", groupData.name);
    console.log("  This group should be automatically deleted after all tests complete.");
  });

  test("creates multiple groups to verify bulk cleanup", async ({ page }) => {
    // Arrange
    const groupsPage = new GroupsListPage(page);
    const createDialog = new CreateGroupDialog(page);
    const groupCount = 3;

    // Act - Create multiple groups
    await page.goto("/groups");
    await groupsPage.waitForLoad();

    for (let i = 0; i < groupCount; i++) {
      const groupData = generateGroupData({
        name: `[TEARDOWN-BULK-${i}] ${new Date().toISOString()}`,
        description: `Bulk cleanup test group ${i + 1}/${groupCount}`,
      });

      await groupsPage.openCreateDialog();
      await createDialog.fillForm(groupData);
      await createDialog.submit();
      await createDialog.waitForClose();

      // Verify each group
      await expect(page.getByText(groupData.name)).toBeVisible();
      console.log(`✓ Created bulk test group ${i + 1}/${groupCount}:`, groupData.name);
    }

    console.log(`  All ${groupCount} groups should be automatically deleted after tests complete.`);
  });
});

/**
 * Manual Verification Steps:
 *
 * 1. Before running tests, check your database:
 *    SELECT COUNT(*) FROM groups WHERE created_by IN ('test-user-id-1', 'test-user-id-2');
 *
 * 2. Run the tests:
 *    npm run test:e2e
 *
 * 3. During test execution, groups are created
 *
 * 4. After all tests complete, check the teardown logs:
 *    You should see: "🧹 Starting database cleanup..."
 *    And: "✓ Cleaned groups"
 *
 * 5. Check database again:
 *    SELECT COUNT(*) FROM groups WHERE created_by IN ('test-user-id-1', 'test-user-id-2');
 *    Result should be 0
 *
 * 6. If groups still exist, check:
 *    - Are E2E_USERNAME_ID and E2E_2_USERNAME_ID set correctly in .env.test?
 *    - Does the teardown have permission to delete? (RLS policies)
 *    - Did the teardown run? (check console output)
 */
