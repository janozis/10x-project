import { Page, Locator } from "@playwright/test";

/**
 * Data interface for activity form steps
 */
export interface ActivityStepData {
  temat?: string;
  cel?: string;
  czas?: string;
  miejsce?: string;
  materialy?: string;
  odpowiedzialni?: string;
  zakresWiedzy?: string;
  uczestnicy?: string;
  zadania?: string; // Added tasks field
  przebieg?: string;
  podsumowanie?: string;
}

/**
 * Page Object Model for Activity Form Page (Multi-step)
 *
 * Encapsulates activity creation/editing form interactions following AAA pattern:
 * - Arrange: Initialize page and locators
 * - Act: Perform actions (fill steps, navigate, submit)
 * - Assert: Verify outcomes (in test files)
 */
export class ActivityFormPage {
  readonly page: Page;

  // Navigation buttons
  readonly backButton: Locator;
  readonly scheduleButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use data-test-id attributes for stable selectors
    this.backButton = page.getByTestId("activity-stepper-back-button");
    this.scheduleButton = page.getByTestId("activity-stepper-schedule-button");
    this.nextButton = page.getByTestId("activity-stepper-next-button");
  }

  /**
   * Navigate to new activity form for a specific group
   */
  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}/activities/new`);
  }

  /**
   * Navigate to edit activity form
   */
  async gotoEdit(groupId: string, activityId: string) {
    await this.page.goto(`/groups/${groupId}/activities/${activityId}/edit`);
  }

  /**
   * Fill a form field by label (only if visible)
   */
  async fillField(label: string, value: string) {
    const field = this.page.getByLabel(new RegExp(label, "i"));
    // Check if field exists and is visible before trying to fill
    const isVisible = await field.isVisible().catch(() => false);
    if (isVisible) {
      await field.fill(value);
    }
  }

  /**
   * Fill current step with provided data
   * This method fills all available fields in the current step
   * Only fills fields that are visible (handles multi-step forms)
   */
  async fillStep(data: ActivityStepData) {
    // Wait for dialog/form to fully render
    await this.page.waitForTimeout(500);

    // Try to fill all fields - only visible ones will be filled
    if (data.temat) {
      await this.fillField("tytuł", data.temat);
    }
    if (data.cel) {
      await this.fillField("cel", data.cel);
    }
    if (data.czas) {
      await this.fillField("czas", data.czas);
    }
    if (data.uczestnicy) {
      await this.fillField("uczestnicy", data.uczestnicy);
    }
    if (data.zadania) {
      await this.fillField("zadania", data.zadania);
    }
    if (data.przebieg) {
      await this.fillField("przebieg", data.przebieg);
    }
    if (data.podsumowanie) {
      await this.fillField("podsumowanie", data.podsumowanie);
    }
    if (data.miejsce) {
      await this.fillField("miejsce", data.miejsce);
    }
    if (data.materialy) {
      await this.fillField("materiały", data.materialy);
    }
    if (data.odpowiedzialni) {
      await this.fillField("odpowiedzialny", data.odpowiedzialni); // Changed to singular form
    }
    if (data.zakresWiedzy) {
      await this.fillField("zakres", data.zakresWiedzy);
    }

    // After filling visible fields, click next/submit
    await this.page.waitForTimeout(300);
  }

  /**
   * Click next/save button to proceed to next step
   */
  async nextStep() {
    await this.nextButton.click();
  }

  /**
   * Click back button to go to previous step
   */
  async previousStep() {
    await this.backButton.click();
  }

  /**
   * Submit the form (on last step)
   */
  async submit() {
    await this.nextButton.click();
  }

  /**
   * Schedule activity to a camp day
   */
  async scheduleToDay() {
    await this.scheduleButton.click();
  }

  /**
   * Fill all steps and submit the complete form
   * This is a convenience method for full form completion
   */
  async createActivity(data: ActivityStepData) {
    await this.fillStep(data);
    await this.submit();
  }

  /**
   * Check if back button is visible
   */
  async canGoBack(): Promise<boolean> {
    return await this.backButton.isVisible();
  }

  /**
   * Check if schedule button is visible
   */
  async canSchedule(): Promise<boolean> {
    return await this.scheduleButton.isVisible();
  }

  /**
   * Check if next button is enabled
   */
  async canProceed(): Promise<boolean> {
    return await this.nextButton.isEnabled();
  }

  /**
   * Get current step indicator text
   * This helps verify which step we're on
   */
  async getCurrentStep(): Promise<string> {
    const stepIndicator = this.page.locator("[data-step-indicator]");
    return (await stepIndicator.textContent()) || "";
  }

  /**
   * Wait for form to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }
}
