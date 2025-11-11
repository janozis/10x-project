import * as React from "react";
import type { AIEvaluationDTO } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface AIEvaluationSummaryProps {
  latest: AIEvaluationDTO | null;
  loading?: boolean;
}

function TruncatedText({ text, max = 280 }: { text: string; max?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = text.length > max;
  const shown = expanded || !isLong ? text : text.slice(0, max) + "…";
  return (
    <div className="space-y-1">
      <p className="whitespace-pre-wrap leading-relaxed text-sm">{shown}</p>
      {isLong ? (
        <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Pokaż mniej" : "Pokaż więcej"}
        </button>
      ) : null}
    </div>
  );
}

export function AIEvaluationSummary({ latest, loading }: AIEvaluationSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    );
  }
  if (!latest) {
    return <div className="text-sm text-muted-foreground">Brak ocen.</div>;
  }
  return (
    <div className="space-y-3" data-test-id="ai-evaluation-result">
      <div className="flex items-center gap-2 flex-wrap" data-test-id="ai-evaluation-scores">
        <Badge variant="secondary" data-test-id="ai-evaluation-lore-score">Lore: {latest.lore_score}</Badge>
        <Badge variant="secondary" data-test-id="ai-evaluation-scouting-score">Wartości: {latest.scouting_values_score}</Badge>
        {typeof latest.tokens === "number" ? <Badge variant="outline">Tokens: {latest.tokens}</Badge> : null}
      </div>

      {latest.lore_feedback ? (
        <div data-test-id="ai-evaluation-lore-feedback">
          <div className="text-xs font-medium text-muted-foreground mb-1">Feedback (lore)</div>
          <TruncatedText text={latest.lore_feedback} />
        </div>
      ) : null}

      {latest.scouting_feedback ? (
        <div data-test-id="ai-evaluation-scouting-feedback">
          <div className="text-xs font-medium text-muted-foreground mb-1">Feedback (wartości)</div>
          <TruncatedText text={latest.scouting_feedback} />
        </div>
      ) : null}

      {Array.isArray(latest.suggestions) && latest.suggestions.length > 0 ? (
        <div data-test-id="ai-evaluation-suggestions">
          <div className="text-xs font-medium text-muted-foreground mb-1">Sugestie</div>
          <SuggestionsList items={latest.suggestions} />
        </div>
      ) : null}
    </div>
  );
}

function SuggestionsList({ items }: { items: string[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, 3);
  return (
    <div className="space-y-1">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {visible.map((s, i) => (
          <li key={i} className="whitespace-pre-wrap leading-relaxed">
            {s}
          </li>
        ))}
      </ul>
      {items.length > 3 ? (
        <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Pokaż mniej" : `Pokaż więcej (${items.length - 3})`}
        </button>
      ) : null}
    </div>
  );
}


