import * as React from "react";
import type { ActivityDTO, ActivityEditorDTO, GroupPermissionsDTO, UUID } from "@/types";
import { requestActivityAIEvaluation } from "./api.client";

interface State {
  requesting: boolean;
  error?: string;
}

export function useAIEvaluationRequest(
  activityId: UUID,
  options: { canRequest: boolean; onRefresh: () => Promise<void> }
) {
  const [state, setState] = React.useState<State>({ requesting: false });
  const timeoutsRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    return () => {
      // Cleanup pending timers on unmount
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  const request = React.useCallback(async () => {
    if (!options.canRequest || state.requesting) return;
    setState({ requesting: true });
    try {
      const res = await requestActivityAIEvaluation(activityId);
      if ("error" in res) {
        throw Object.assign(new Error(res.error.message), { body: res });
      }
      const nextSec = res.data.next_poll_after_sec || 5;
      // Do a few refresh attempts in case processing takes longer
      const attempts = [1, 2, 3];
      attempts.forEach((multiplier) => {
        const id = window.setTimeout(() => {
          void options.onRefresh();
        }, nextSec * 1000 * multiplier);
        timeoutsRef.current.push(id);
      });
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Nie udało się zlecić oceny AI.";
      setState({ requesting: false, error: message });
      return;
    }
    setState({ requesting: false });
  }, [activityId, options, state.requesting]);

  return {
    requesting: state.requesting,
    error: state.error,
    request,
  } as const;
}


