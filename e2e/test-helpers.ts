/**
 * Test Helpers and Utilities for E2E Tests
 *
 * Provides reusable functions for generating unique test data
 * to avoid conflicts and ensure test isolation.
 */

import type { Page } from "@playwright/test";

/**
 * Generate a unique timestamp-based suffix
 */
export function getTimestamp(): string {
  return Date.now().toString();
}

/**
 * Generate a unique test email address
 * @param prefix - Optional prefix for the email (default: 'test')
 * @returns Unique email address
 */
export function generateUniqueEmail(prefix = "test"): string {
  const timestamp = getTimestamp();
  return `${prefix}${timestamp}@example.com`;
}

/**
 * Generate a unique group name
 * @param prefix - Optional prefix for the group name (default: 'Test Group')
 * @returns Unique group name
 */
export function generateUniqueGroupName(prefix = "Test Group"): string {
  const timestamp = getTimestamp();
  return `${prefix} ${timestamp}`;
}

/**
 * Generate a unique activity name
 * @param prefix - Optional prefix for the activity name (default: 'Test Activity')
 * @returns Unique activity name
 */
export function generateUniqueActivityName(prefix = "Test Activity"): string {
  const timestamp = getTimestamp();
  return `${prefix} ${timestamp}`;
}

/**
 * Generate a unique task title
 * @param prefix - Optional prefix for the task title (default: 'Test Task')
 * @returns Unique task title
 */
export function generateUniqueTaskTitle(prefix = "Test Task"): string {
  const timestamp = getTimestamp();
  return `${prefix} ${timestamp}`;
}

/**
 * Generate a unique camp day name
 * @param prefix - Optional prefix for the camp day name (default: 'Test Day')
 * @returns Unique camp day name
 */
export function generateUniqueCampDayName(prefix = "Test Day"): string {
  const timestamp = getTimestamp();
  return `${prefix} ${timestamp}`;
}

/**
 * Generate a random string of specified length
 * Useful for generating random codes or identifiers
 * @param length - Length of the random string
 * @returns Random alphanumeric string
 */
export function generateRandomString(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate test data for creating a group
 * @param overrides - Optional overrides for specific fields
 * @returns Object with group creation data
 */
export function generateGroupData(
  overrides?: Partial<{
    name: string;
    description: string;
    lore_theme: string;
    start_date: string;
    end_date: string;
    max_members: number;
  }>
) {
  const timestamp = getTimestamp();
  const defaultName = `Test Group ${timestamp}`;

  // All fields are required by backend validation schema
  return {
    name: overrides?.name || defaultName,
    description: overrides?.description || `Description for ${defaultName}`,
    lore_theme: overrides?.lore_theme || "Test lore theme",
    start_date: overrides?.start_date || getFutureDate(7),
    end_date: overrides?.end_date || getFutureDate(14),
    max_members: overrides?.max_members || 50,
  };
}

/**
 * Generate test data for creating an activity
 * @param overrides - Optional overrides for specific fields
 * @returns Object with activity creation data
 */
export function generateActivityData(
  overrides?: Partial<{
    temat: string;
    cel: string;
    czas: string;
    miejsce: string;
    materialy: string;
    odpowiedzialni: string;
    zakresWiedzy: string;
    uczestnicy: string;
    zadania: string;
    przebieg: string;
    podsumowanie: string;
  }>
) {
  const timestamp = getTimestamp();
  const defaultTemat = `Test Activity ${timestamp}`;

  return {
    temat: overrides?.temat || defaultTemat,
    cel: overrides?.cel || "Cel testowej aktywności",
    czas: overrides?.czas || "60", // Just the number, no "minut"
    miejsce: overrides?.miejsce || "Sala testowa",
    materialy: overrides?.materialy || "Materiały testowe",
    odpowiedzialni: overrides?.odpowiedzialni || "Tester",
    zakresWiedzy: overrides?.zakresWiedzy || "Zakres testowy",
    uczestnicy: overrides?.uczestnicy || "Wszyscy uczestnicy",
    zadania: overrides?.zadania || "Zadania testowe",
    przebieg: overrides?.przebieg || "Przebieg testowej aktywności",
    podsumowanie: overrides?.podsumowanie || "Podsumowanie testowe",
  };
}

/**
 * Generate test data for creating a task
 * @param overrides - Optional overrides for specific fields
 * @returns Object with task creation data
 */
export function generateTaskData(
  overrides?: Partial<{
    title: string;
    dueDate: string;
    description: string;
    activityId: string;
  }>
) {
  const timestamp = getTimestamp();
  const defaultTitle = `Test Task ${timestamp}`;

  return {
    title: overrides?.title || defaultTitle,
    dueDate: overrides?.dueDate,
    description: overrides?.description || `Description for ${defaultTitle}`,
    activityId: overrides?.activityId,
  };
}

/**
 * Wait for a specific amount of time
 * Use sparingly - prefer waitFor conditions
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a future date string in YYYY-MM-DD format
 * @param daysFromNow - Number of days from today
 * @returns Date string
 */
export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

/**
 * Generate a past date string in YYYY-MM-DD format
 * @param daysAgo - Number of days before today
 * @returns Date string
 */
export function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Logout user by clicking the logout button in the UI
 * @param page - Playwright Page object
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click the logout button in the topbar
  // Use getByRole instead of getByTestId for better reliability
  const logoutButton = page.getByRole("button", { name: /wyloguj/i });
  await logoutButton.waitFor({ state: "visible", timeout: 10000 });
  await logoutButton.click();

  // Wait for redirect to login page
  await page.waitForURL("**/auth/login", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}
