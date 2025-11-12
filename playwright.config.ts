import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables - override any existing env vars from .env
dotenv.config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
});

// Debug: Log which environment is being used
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🧪 PLAYWRIGHT ENVIRONMENT CHECK");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("E2E_USERNAME:", process.env.E2E_USERNAME);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL?.substring(0, 30) + "...");
console.log("BASE_URL:", process.env.BASE_URL);
console.log("WebServer command:", "npm run dev:test");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

/**
 * Playwright Configuration for E2E Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /*
   * Workers configuration:
   * - CI: Always use 1 worker to avoid race conditions
   * - Local: 1 worker for stability (multi-user tests need isolation)
   *
   * Note: groups-join.spec.ts requires workers=1 due to User A/B login flows
   */
  workers: 1,

  /* Reporter to use */
  reporter: [["html"], ["list"]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || "http://localhost:4321",

    /* Configure test id attribute to match project convention */
    testIdAttribute: "data-test-id",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers - using only Chromium as per guidelines */
  projects: [
    // Setup project to authenticate once before all tests
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* Use authenticated state from setup */
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      teardown: "cleanup",
    },
    // Teardown project to clean database after all tests
    {
      name: "cleanup",
      testMatch: /.*\.teardown\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev:test",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
