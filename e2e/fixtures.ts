/**
 * Custom Playwright Fixtures with Auto-Cleanup
 * 
 * This extends the base Playwright test with automatic cleanup after each test.
 * Import { test, expect } from this file instead of @playwright/test
 * 
 * To disable cleanup for a specific test:
 *   test('my test', async ({ page, skipCleanup }) => {
 *     skipCleanup();
 *     // ... test code
 *   });
 */

import { test as base, expect } from "@playwright/test";
import { cleanupTestData } from "./test-cleanup-helper";

type TestFixtures = {
  skipCleanup: () => void;
};

// Extend base test with auto-cleanup fixture
export const test = base.extend<TestFixtures>({
  skipCleanup: async ({}, use, testInfo) => {
    let shouldSkip = false;
    await use(() => {
      shouldSkip = true;
      console.log("   ⏭️  Cleanup will be skipped for this test");
    });
    
    // Store skip flag in testInfo for access in autoCleanup
    (testInfo as any)._skipCleanup = shouldSkip;
  },
  
  // Auto-cleanup fixture that runs after each test
  autoCleanup: [async ({}, use, testInfo) => {
    // Setup (runs before test)
    await use();
    
    // Teardown (runs after test)
    const shouldSkip = (testInfo as any)._skipCleanup;
    if (shouldSkip) {
      console.log("   ⏭️  Cleanup skipped");
      return;
    }
    
    console.log("   🧹 Cleaning up after test...");
    await cleanupTestData();
    console.log("   ✓  Cleanup completed");
  }, { auto: true }], // auto: true makes it run automatically
});

export { expect };

