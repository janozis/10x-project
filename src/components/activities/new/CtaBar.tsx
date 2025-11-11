import * as React from "react";
import { Button } from "@/components/ui/button";

export interface CtaBarProps {
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  isCreated: boolean;
  onBack: () => void;
  onNextOrSubmit: () => void | Promise<void>;
  onAddToSchedule: () => void;
}

export default function CtaBar({
  canGoBack,
  canGoNext,
  isLastStep,
  isSubmitting,
  isCreated,
  onBack,
  onNextOrSubmit,
  onAddToSchedule,
}: CtaBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={!canGoBack || isSubmitting} data-test-id="activity-stepper-back-button">
          Wstecz
        </Button>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onAddToSchedule} disabled={!isCreated} data-test-id="activity-stepper-schedule-button">
          Dodaj do planu dnia
        </Button>
        <Button type="button" onClick={() => void onNextOrSubmit()} disabled={!canGoNext || isSubmitting} data-test-id="activity-stepper-next-button">
          {isLastStep ? (isSubmitting ? "Zapisywanie..." : "Zakończ i zapisz") : "Zapisz i kontynuuj"}
        </Button>
      </div>
    </div>
  );
}


