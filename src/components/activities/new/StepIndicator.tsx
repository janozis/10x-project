import * as React from "react";
import { Button } from "@/components/ui/button";
import type { StepId } from "./types";

export interface StepIndicatorProps {
  current: StepId;
  completed: StepId[];
  onStepClick: (id: StepId) => void;
}

const STEP_LABELS: Record<StepId, string> = {
  basics: "Podstawy",
  content: "Treść",
  logistics: "Logistyka",
  summary: "Podsumowanie",
};

const ORDER: StepId[] = ["basics", "content", "logistics", "summary"];

export default function StepIndicator({ current, completed, onStepClick }: StepIndicatorProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = ORDER.indexOf(current);
    if (e.key === "ArrowRight") {
      const next = ORDER[Math.min(ORDER.length - 1, idx + 1)];
      onStepClick(next);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      const prev = ORDER[Math.max(0, idx - 1)];
      onStepClick(prev);
      e.preventDefault();
    }
  };
  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Kroki tworzenia"
      className="flex flex-wrap gap-2"
      onKeyDown={onKeyDown}
    >
      {ORDER.map((id, idx) => {
        const isActive = id === current;
        const isDone = completed.includes(id);
        return (
          <Button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "step" : undefined}
            tabIndex={isActive ? 0 : -1}
            variant={isActive ? "default" : isDone ? "secondary" : "outline"}
            onClick={() => onStepClick(id)}
          >
            <span className="mr-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">{idx + 1}</span>
            {STEP_LABELS[id]}
          </Button>
        );
      })}
    </div>
  );
}


