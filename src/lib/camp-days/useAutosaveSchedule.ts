import * as React from "react";
import type { ActivityScheduleUpdateCommand, ApiError, ApiSingle, ActivityScheduleDTO, UUID } from "@/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface UseAutosaveScheduleOptions {
  delayMs?: number;
  onStateChange?: (state: SaveState, message?: string) => void;
  onServerApplied?: (dto: ActivityScheduleDTO) => void;
}

export function useAutosaveSchedule(scheduleId: UUID, opts?: UseAutosaveScheduleOptions) {
  const delay = opts?.delayMs ?? 650;
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<ActivityScheduleUpdateCommand | null>(null);
  const [state, setState] = React.useState<SaveState>("idle");

  const setStateBoth = (s: SaveState, msg?: string) => {
    setState(s);
    opts?.onStateChange?.(s, msg);
  };

  const queue = React.useCallback((partial: ActivityScheduleUpdateCommand) => {
    pendingRef.current = { ...(pendingRef.current ?? {}), ...partial };
    if (timerRef.current) clearTimeout(timerRef.current);
    setStateBoth("saving");
    timerRef.current = setTimeout(async () => {
      const body = pendingRef.current;
      pendingRef.current = null;
      try {
        const res = await fetch(`/api/activity-schedules/${scheduleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        if (!res.ok) {
          const err = (await res.json()) as ApiError;
          setStateBoth("error", err.error?.message || "Błąd zapisu");
          return;
        }
        const out = (await res.json()) as ApiSingle<ActivityScheduleDTO>;
        setStateBoth("saved");
        opts?.onServerApplied?.(out.data);
        setTimeout(() => setStateBoth("idle"), 800);
      } catch {
        setStateBoth("error", "Błąd sieci");
      }
    }, delay);
  }, [delay, scheduleId]);

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { queue, state } as const;
}


