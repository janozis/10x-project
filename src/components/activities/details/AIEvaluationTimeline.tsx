import * as React from "react";
import type { AIEvaluationDTO } from "@/types";

export interface AIEvaluationTimelineProps {
  evaluations: AIEvaluationDTO[];
  loading?: boolean;
}

export function AIEvaluationTimeline({ evaluations, loading }: AIEvaluationTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (!evaluations.length) {
    return <div className="text-sm text-muted-foreground">Brak ocen AI.</div>;
  }
  return (
    <ul className="space-y-2">
      {evaluations.map((ev) => (
        <li key={ev.id} className="text-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Wersja {ev.version}</span>
              <span className="ml-2">Lore: {ev.lore_score}</span>
              <span className="ml-2">Wartości: {ev.scouting_values_score}</span>
            </div>
            <span className="text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
