import { test, expect } from "@playwright/test";
import { DashboardPage } from "./page-objects";

/**
 * Authenticated E2E Tests
 *
 * These tests run with pre-authenticated state from auth.setup.ts
 * The user is already logged in before these tests start
 */

test.describe("Authenticated User Actions", () => {
  test.use({
    storageState: process.env.STORAGE_STATE || "e2e/.auth/user.json",
  });

  test("should access dashboard when authenticated", async ({ page }) => {
    // Arrange
    const dashboardPage = new DashboardPage(page);

    // Act
    await dashboardPage.goto();

    // Assert
    await expect(dashboardPage.navigation).toBeVisible();
    const isLoggedIn = await dashboardPage.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test("should navigate to groups page", async ({ page }) => {
    // Arrange
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Act
    await dashboardPage.goToGroups();

    // Assert
    await expect(page).toHaveURL(/\/groups/);
  });

  test("should have user session maintained", async ({ page }) => {
    // Arrange & Act
    await page.goto("/");

    // Assert - User should still be logged in
    await expect(page.locator("nav")).toBeVisible();

    // Should not be redirected to login
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });
});

/**
 * API Tests with Authentication
 * Test backend endpoints directly
 */
test.describe("API Tests (Authenticated)", () => {
  test.use({
    storageState: process.env.STORAGE_STATE || "e2e/.auth/user.json",
  });

  test("should access protected API endpoint", async ({ request, page }) => {
    // First visit the page to set cookies in the right context
    await page.goto("/");

    // Arrange & Act
    const response = await request.get("/api/groups");

    // Assert
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});
