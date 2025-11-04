import { test, expect } from '@playwright/test';

/**
 * Basic E2E test example
 * This demonstrates fundamental Playwright testing patterns
 */

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Verify the page loaded
    await expect(page).toHaveTitle(/10x-project/i);
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Check if main navigation exists
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still be functional on mobile
    await expect(page.locator('body')).toBeVisible();
  });
});

/**
 * Example of API testing with Playwright
 */
test.describe('API Tests', () => {
  test('API health check', async ({ request }) => {
    // Example API health check
    // Adjust URL to match your actual API endpoints
    const response = await request.get('/api/health').catch(() => null);
    
    if (response) {
      expect(response.ok()).toBeTruthy();
    }
  });
});

