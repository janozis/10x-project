import * as React from "react";
import type { UUID, ActivityWithEditorsDTO, ApiResponse, ApiError } from "@/types";
import type { ActivityCreateVM } from "../types";

export interface AutosaveHookState {
  isSaving: boolean;
  lastSavedAt?: string;
  error?: string;
}

export interface UseAutosaveOptions {
  enabled: boolean;
  debounceMs?: number;
  onForbidden?: (message?: string) => void;
}

type Snapshot = Omit<ActivityCreateVM, "duration_minutes"> & { duration_minutes: number | "" };

function toUpdatePayload(current: ActivityCreateVM, snapshot: Snapshot) {
  const payload: Record<string, unknown> = {};
  const fields: (keyof ActivityCreateVM)[] = [
    "title",
    "objective",
    "tasks",
    "duration_minutes",
    "location",
    "materials",
    "responsible",
    "knowledge_scope",
    "participants",
    "flow",
    "summary",
  ];
  for (const f of fields) {
    const curr = current[f];
    const prev = snapshot[f as keyof Snapshot];
    if (f === "duration_minutes") {
      const currNum = typeof curr === "number" ? curr : curr === "" ? "" : parseInt(String(curr || 0), 10);
      const prevNum = typeof prev === "number" ? prev : prev === "" ? "" : parseInt(String(prev || 0), 10);
      if (currNum !== prevNum && currNum !== "") payload[f] = currNum;
    } else if (typeof curr === "string" && typeof prev === "string") {
      if (curr.trim() !== prev.trim()) payload[f] = curr.trim();
    }
  }
  return payload;
}

export function useAutosave(activityId: UUID | undefined, values: ActivityCreateVM, options: UseAutosaveOptions) {
  const { enabled, debounceMs = 1000, onForbidden } = options;
  const [state, setState] = React.useState<AutosaveHookState>({ isSaving: false });
  const snapshotRef = React.useRef<Snapshot | null>(null);
  const timerRef = React.useRef<number | null>(null);

  // Reset snapshot when enabling autosave or when activity changes
  React.useEffect(() => {
    if (!enabled || !activityId) return;
    snapshotRef.current = { ...values } as Snapshot;
  }, [enabled, activityId]);

  // Debounced autosave on value changes
  React.useEffect(() => {
    if (!enabled || !activityId) return;
    if (!snapshotRef.current) return;

    const payload = toUpdatePayload(values, snapshotRef.current);
    if (Object.keys(payload).length === 0) return; // nothing to save

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      setState((s) => ({ ...s, isSaving: true, error: undefined }));
      try {
        const res = await fetch(`/api/activities/${activityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as ApiResponse<ActivityWithEditorsDTO>;
        if (!res.ok || "error" in json) {
          const err = json as ApiError;
          // If forbidden/unauthorized - signal to parent to disable autosave and show banner per plan
          if (err.error.code === "FORBIDDEN_ROLE" || err.error.code === "UNAUTHORIZED") {
            onForbidden?.(err.error.message);
          }
          setState((s) => ({ ...s, isSaving: false, error: err.error.message || "Autosave failed" }));
          return;
        }
        snapshotRef.current = { ...values } as Snapshot;
        setState({ isSaving: false, lastSavedAt: new Date().toISOString(), error: undefined });
      } catch (e: unknown) {
        setState((s) => ({ ...s, isSaving: false, error: e?.message || "Network error" }));
      }
    }, debounceMs) as unknown as number;

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // values is a large object; dependencies are okay for this hook
  }, [values, enabled, activityId, debounceMs, onForbidden]);

  return state as const;
}
