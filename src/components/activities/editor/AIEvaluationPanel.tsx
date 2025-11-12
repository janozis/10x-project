import * as React from "react";
import type { UUID } from "@/types";
import { Button } from "@/components/ui/button";
import { useAIEvaluations } from "@/lib/editor/useAIEvaluations";

interface AIEvaluationPanelProps {
  activityId: UUID;
  canRequest?: boolean;
  onRequest?: () => void | Promise<void>;
  requestTrigger?: number;
  nextPollAfterSec?: number;
}

export function AIEvaluationPanel({
  activityId,
  canRequest = false,
  onRequest,
  requestTrigger,
  nextPollAfterSec,
}: AIEvaluationPanelProps): JSX.Element {
  const { items, loading, error, refresh } = useAIEvaluations(activityId);

  // Polling after a request trigger
  React.useEffect(() => {
    if (!requestTrigger) return;
    let cancelled = false;
    const baselineId = items[0]?.id;
    const delay = (nextPollAfterSec && nextPollAfterSec > 0 ? nextPollAfterSec : 5) * 1000;

    async function pollOnce() {
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      const changed = items[0]?.id !== baselineId;
      if (!changed) {
        setTimeout(pollOnce, delay);
      }
    }

    const t = setTimeout(pollOnce, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestTrigger]);
  return (
    <div className="rounded-lg border p-6 text-sm space-y-3">
      <h2 className="text-lg font-semibold">Oceny AI</h2>
      {loading ? <div className="text-muted-foreground">Ładowanie…</div> : null}
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm"
        >
          {error}
        </div>
      ) : null}
      {!loading && items.length === 0 && (
        <div className="text-muted-foreground text-center py-4">
          Brak ocen AI. Kliknij przycisk poniżej, aby poprosić o pierwszą ocenę.
        </div>
      )}
      <ul className="space-y-3">
        {items.map((ev) => (
          <li key={ev.id} className="rounded-md border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Wersja {ev.version}</div>
              <div className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Zgodność z lore:</span>{" "}
                <span className="font-semibold">{ev.lore_score}/10</span>
              </div>
              <div>
                <span className="text-muted-foreground">Wartości harcerskie:</span>{" "}
                <span className="font-semibold">{ev.scouting_values_score}/10</span>
              </div>
            </div>
            {ev.lore_feedback && (
              <div className="text-xs">
                <div className="font-medium text-muted-foreground mb-1">Feedback (lore):</div>
                <div className="pl-2 border-l-2 border-muted">{ev.lore_feedback}</div>
              </div>
            )}
            {ev.scouting_feedback && (
              <div className="text-xs">
                <div className="font-medium text-muted-foreground mb-1">Feedback (harcerstwo):</div>
                <div className="pl-2 border-l-2 border-muted">{ev.scouting_feedback}</div>
              </div>
            )}
            {ev.suggestions && ev.suggestions.length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-muted-foreground mb-1">Sugestie ({ev.suggestions.length}):</div>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {ev.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={!canRequest}
          onClick={() => {
            void onRequest?.();
          }}
        >
          Poproś o nową ocenę
        </Button>
      </div>
    </div>
  );
}
