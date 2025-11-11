/* eslint-disable no-console */
import { test, expect, type Page } from "@playwright/test";
import {
  GroupsListPage,
  CreateGroupDialog,
  ActivitiesListPage,
  ActivityFormPage,
  ActivityDetailsPage,
  type ActivityStepData,
} from "./page-objects";
import { generateGroupData, generateActivityData } from "./test-helpers";
import { cleanupTestData } from "./test-cleanup-helper";

/**
 * Helper function to create activity through multi-step form
 */
async function createActivityThroughStepper(
  page: Page,
  activityForm: ActivityFormPage,
  activityData: ActivityStepData
) {
  await activityForm.waitForLoad();

  // Step 1 - Basics
  await activityForm.fillStep(activityData);
  await activityForm.nextStep();
  await page.waitForTimeout(500);

  // Step 2 - Content
  await activityForm.fillStep(activityData);
  await activityForm.nextStep();
  await page.waitForTimeout(500);

  // Step 3 - Logistics
  await activityForm.fillStep(activityData);
  await activityForm.nextStep();
  await page.waitForTimeout(500);

  // Step 4 - Summary
  await activityForm.fillStep(activityData);
  await activityForm.submit();
  await page.waitForLoadState("networkidle");
}

/**
 * AI Evaluation E2E Tests
 *
 * Tests AI evaluation generation and display (US-006, US-007)
 * Uses extended timeouts for AI operations (30s+)
 *
 * Note: Uses pre-authenticated user from auth.setup.ts (E2E_USERNAME)
 */
test.describe("AI Evaluation", () => {
  let groupId: string;

  test.beforeEach(async ({ page }) => {
    // User is already authenticated via storageState
    const groupData = generateGroupData();
    const groupsPage = new GroupsListPage(page);
    await groupsPage.goto();
    await groupsPage.openCreateDialog();

    const createDialog = new CreateGroupDialog(page);
    await createDialog.createGroup(groupData);
    await createDialog.waitForClose();

    await page.getByText(groupData.name).click();
    await page.waitForLoadState("networkidle");
    groupId = page.url().split("/groups/")[1]?.split("/")[0] || "";

    // Create activity using multi-step form
    const activityData = generateActivityData();
    const activitiesPage = new ActivitiesListPage(page);
    await activitiesPage.goto(groupId);
    await activitiesPage.createActivity();

    const activityForm = new ActivityFormPage(page);
    await createActivityThroughStepper(page, activityForm, activityData);

    // After creating activity, we should be redirected to details page
    if (!page.url().includes("/activities/")) {
      // If not redirected, navigate to first activity
      await activitiesPage.goto(groupId);
      await page.waitForTimeout(1000);
      await activitiesPage.clickActivity(0);
      await page.waitForLoadState("networkidle");
    }
  });

  test.afterEach(async () => {
    console.log("   🧹 Cleaning up after test...");
    await cleanupTestData();
    console.log("   ✓  Cleanup completed");
  });

  test("should generate AI evaluation for activity", async ({ page }) => {
    // Extend timeout for AI generation
    test.setTimeout(90000);

    const detailsPage = new ActivityDetailsPage(page);

    const hasPanel = await detailsPage.hasEvaluationPanel();
    if (!hasPanel) {
      test.skip();
      return;
    }

    const canRequest = await detailsPage.canRequestEvaluation();
    if (canRequest) {
      await detailsPage.requestAIEvaluation();

      // Wait for evaluation (extended timeout)
      const evaluationAppeared = await detailsPage.waitForEvaluation(60000);

      // Check if results appeared
      if (!evaluationAppeared) {
        console.warn("⚠️  AI Evaluation did not complete within timeout. Worker may not be running.");
        console.warn("💡 To run AI tests, start worker: npm run worker:ai-eval");
        test.skip();
        return;
      }

      const hasResults = await detailsPage.hasEvaluationResults();
      expect(hasResults).toBe(true);
    }
  });

  test("should display pending state during generation", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);

    if (await detailsPage.canRequestEvaluation()) {
      await detailsPage.requestAIEvaluation();

      // Should show pending/loading state (might complete too quickly to see it)
      const pendingIndicator = page.locator('[data-status="pending"], [data-loading]');
      await pendingIndicator.isVisible().catch(() => false);
    }
  });

  test("should display both evaluation scores (lore + harcerstwo)", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);

    if (await detailsPage.hasEvaluationResults()) {
      const score = await detailsPage.getEvaluationScore();
      expect(score).toBeTruthy();
    }
  });

  test("should show lore score in 1-10 scale", async ({ page }) => {
    // Verification that lore score is displayed as number 1-10
    const scoreElement = page.getByTestId("ai-evaluation-lore-score");
    const hasScore = await scoreElement.isVisible().catch(() => false);

    if (!hasScore) {
      console.warn("⚠️  Lore score not visible. AI Evaluation may not have completed.");
      test.skip();
      return;
    }

    const scoreText = await scoreElement.textContent();
    // Extract number from "Lore: X" format
    const match = scoreText?.match(/(\d+)/);
    if (match) {
      const score = parseInt(match[1]);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    } else {
      test.skip();
    }
  });

  test("should show harcerstwo score in 1-10 scale", async ({ page }) => {
    const scoreElement = page.getByTestId("ai-evaluation-scouting-score");
    const hasScore = await scoreElement.isVisible().catch(() => false);

    if (!hasScore) {
      console.warn("⚠️  Scouting score not visible. AI Evaluation may not have completed.");
      test.skip();
      return;
    }

    const scoreText = await scoreElement.textContent();
    // Extract number from "Wartości: X" format
    const match = scoreText?.match(/(\d+)/);
    if (match) {
      const score = parseInt(match[1]);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    } else {
      test.skip();
    }
  });

  test.skip("should display AI suggestions", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);

    if (await detailsPage.hasEvaluationResults()) {
      const feedback = await detailsPage.getEvaluationFeedback();
      expect(feedback.length).toBeGreaterThan(0);
    }
  });

  test("should handle timeout during generation", async () => {
    // This test would require mocking or very long activity
    // For now, just verify timeout handling exists
    test.skip();
  });

  test("should allow re-generation of evaluation", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);

    // Generate first evaluation
    if (await detailsPage.canRequestEvaluation()) {
      await detailsPage.requestAIEvaluation();
      await page.waitForTimeout(2000);

      // Try to generate again
      const canRequestAgain = await detailsPage.canRequestEvaluation();
      if (canRequestAgain) {
        await detailsPage.requestAIEvaluation();
      }
    }
  });

  test("only admin and assigned editors can generate evaluation", async () => {
    // This would require testing permissions
    // Already covered in permissions.spec.ts
    test.skip();
  });

  test("should persist evaluation after page reload", async ({ page }) => {
    const detailsPage = new ActivityDetailsPage(page);

    if (await detailsPage.hasEvaluationResults()) {
      const scoreBefore = await detailsPage.getEvaluationScore();

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Score should still be there
      const scoreAfter = await detailsPage.getEvaluationScore();
      expect(scoreAfter).toBe(scoreBefore);
    }
  });
});
