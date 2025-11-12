import * as React from "react";
import type { UUID } from "@/types";

export type ColumnId = "title" | "objective" | "ai" | "editors" | "updated_at";
export interface ColumnVisibilityState {
  title: boolean;
  objective: boolean;
  ai: boolean;
  editors: boolean;
  updated_at: boolean;
}

const DEFAULTS: ColumnVisibilityState = {
  title: true,
  objective: true,
  ai: true,
  editors: true,
  updated_at: true,
};

function makeStorageKey(groupId: UUID, userId: UUID) {
  return `lp:cols:${groupId}:${userId}`;
}

export function useColumnPreferences(groupId: UUID | undefined, userId: UUID | undefined) {
  const [state, setState] = React.useState<ColumnVisibilityState>(DEFAULTS);
  const ready = typeof window !== "undefined" && !!groupId && !!userId;

  // Load from localStorage
  React.useEffect(() => {
    if (!ready) return;
    try {
      const raw = window.localStorage.getItem(makeStorageKey(groupId!, userId!));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ColumnVisibilityState>;
        const next: ColumnVisibilityState = {
          ...DEFAULTS,
          ...parsed,
        };
        // Ensure title is always visible
        next.title = true;
        setState(next);
      } else {
        setState({ ...DEFAULTS });
      }
    } catch {
      setState({ ...DEFAULTS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, userId]);

  const persist = React.useCallback(
    (next: ColumnVisibilityState) => {
      if (!ready) return;
      try {
        window.localStorage.setItem(makeStorageKey(groupId!, userId!), JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
    },
    [groupId, userId, ready]
  );

  const update = React.useCallback(
    (updater: (prev: ColumnVisibilityState) => ColumnVisibilityState) => {
      setState((prev) => {
        const next = updater(prev);
        // Enforce invariant
        if (!next.title) next.title = true;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const set = React.useCallback(
    (next: ColumnVisibilityState) => {
      // Enforce invariant
      if (!next.title) next.title = true;
      setState(next);
      persist(next);
    },
    [persist]
  );

  const toggle = React.useCallback(
    (column: ColumnId) => {
      update((prev) => ({ ...prev, [column]: column === "title" ? true : !prev[column] }));
    },
    [update]
  );

  const reset = React.useCallback(() => set({ ...DEFAULTS }), [set]);

  return {
    state,
    set,
    toggle,
    reset,
  } as const;
}
