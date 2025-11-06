import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { GroupsListPage } from './page-objects/GroupsListPage';

test.describe('Groups - Empty List for New User', () => {
  test('new user should see empty groups list without errors', async ({ page }) => {
    // Generate unique email for new user
    const timestamp = Date.now();
    const email = `newuser${timestamp}@example.com`;
    const password = 'TestPassword123!';

    // Register new user via Supabase Auth API
    await page.goto('/auth/register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^hasło$/i).fill(password);
    await page.getByLabel(/powtórz hasło/i).fill(password);
    
    // Wait for button to be enabled (form validation)
    const submitButton = page.getByRole('button', { name: /zarejestruj/i });
    await submitButton.waitFor({ state: 'visible' });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for registration to complete
    await page.waitForLoadState('networkidle');

    // Navigate to groups page (since registration doesn't auto-redirect)
    await page.goto('/groups');

    // Should see empty state, not an error
    const groupsPage = new GroupsListPage(page);
    await expect(groupsPage.emptyStateMessage).toBeVisible();
    
    // Should NOT see error message
    await expect(groupsPage.errorMessage).not.toBeVisible();
    
    // Should see "Create Group" button
    await expect(groupsPage.createGroupButton).toBeVisible();
  });

  test('new user can create their first group', async ({ page }) => {
    // Generate unique email for new user
    const timestamp = Date.now();
    const email = `firstgroup${timestamp}@example.com`;
    const password = 'TestPassword123!';

    // Register new user
    await page.goto('/auth/register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^hasło$/i).fill(password);
    await page.getByLabel(/powtórz hasło/i).fill(password);
    
    // Wait for button to be enabled (form validation)
    const submitButton = page.getByRole('button', { name: /zarejestruj/i });
    await submitButton.waitFor({ state: 'visible' });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for registration to complete
    await page.waitForLoadState('networkidle');

    // Navigate to groups page
    await page.goto('/groups');
    
    const groupsPage = new GroupsListPage(page);
    await expect(groupsPage.emptyStateMessage).toBeVisible();

    // Click create group button
    await groupsPage.createGroupButton.click();
    
    // Should open create group dialog (not navigate to new page)
    // Wait for dialog to be visible
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

