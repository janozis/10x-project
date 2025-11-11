import * as React from "react";
import type { AIEvaluationDTO, UUID } from "@/types";
import { listActivityAIEvaluations, requestActivityAIEvaluation } from "@/lib/activities/api.client";

export function useAIEvaluations(activityId: UUID) {
  const [items, setItems] = React.useState<AIEvaluationDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [requesting, setRequesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listActivityAIEvaluations(activityId);
      if ("data" in res) setItems(res.data);
      else throw new Error(res?.error?.message || "Load failed");
    } catch (e: unknown) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = React.useCallback(async () => {
    setRequesting(true);
    try {
      await requestActivityAIEvaluation(activityId);
    } finally {
      setRequesting(false);
    }
  }, [activityId]);

  return { items, loading, error, refresh, request, requesting } as const;
}
