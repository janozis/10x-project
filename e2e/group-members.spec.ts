import { test, expect } from '@playwright/test';
import { 
  GroupsListPage, 
  CreateGroupDialog,
  GroupPage,
  GroupMembersPage
} from './page-objects';
import { 
  generateGroupData 
} from './test-helpers';
import { cleanupTestData } from './test-cleanup-helper';

/**
 * Group Members E2E Tests
 * 
 * Tests member management (US-003, US-004)
 * - Display members list
 * 
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 */
test.describe('Group Members Management', () => {
  test.afterEach(async () => {
    console.log('   🧹 Cleaning up after test...');
    await cleanupTestData();
    console.log('   ✓  Cleanup completed');
  });
  
  test('should display members list', async ({ page }) => {
    // Arrange: User is already authenticated via storageState
    const groupData = generateGroupData();
    
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();
    
    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();
    
    await page.getByText(groupData.name).click();
    await page.waitForLoadState('networkidle');
    
    // Act: Navigate to members page
    const groupPage = new GroupPage(page);
    await groupPage.goToMembers();
    
    // Assert: Members list should be visible
    const membersPage = new GroupMembersPage(page);
    await membersPage.waitForLoad();
    
    const hasMembersTable = await membersPage.hasMembersTable();
    expect(hasMembersTable).toBe(true);
    
    // Should see at least the creator
    const memberCount = await membersPage.getMemberCount();
    expect(memberCount).toBeGreaterThanOrEqual(1);
  });
});

