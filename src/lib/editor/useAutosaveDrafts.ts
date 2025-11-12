import * as React from "react";
import type { UUID } from "@/types";

export interface ActivityFormValues {
  title: string;
  objective: string;
  tasks: string;
  duration_minutes: number;
  location: string;
  materials: string;
  responsible: string;
  knowledge_scope: string;
  participants: string;
  flow: string;
  summary: string;
}

export interface AutosaveDraft {
  id: string;
  activityId: UUID;
  values: ActivityFormValues;
  updatedAt: number;
  etag?: string;
}

const MAX_DRAFTS = 20;
const STORAGE_PREFIX = "lp:activity:";

function keyFor(activityId: UUID) {
  return `${STORAGE_PREFIX}${activityId}:drafts`;
}

export function useAutosaveDrafts(activityId: UUID) {
  const [drafts, setDrafts] = React.useState<AutosaveDraft[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(keyFor(activityId));
      const list = raw ? (JSON.parse(raw) as AutosaveDraft[]) : [];
      setDrafts(list);
    } catch {
      setDrafts([]);
    }
  }, [activityId]);

  React.useEffect(() => {
    load();
  }, [load]);

  function persist(next: AutosaveDraft[]) {
    try {
      localStorage.setItem(keyFor(activityId), JSON.stringify(next));
      setError(null);
    } catch {
      setError("Przekroczono limit pamięci przeglądarki dla szkiców.");
    }
  }

  const saveDraft = React.useCallback(
    (values: ActivityFormValues, etag?: string) => {
      const draft: AutosaveDraft = {
        id: new Date().toISOString(),
        activityId,
        values,
        updatedAt: Date.now(),
        etag,
      };
      const next = [draft, ...drafts].slice(0, MAX_DRAFTS);
      setDrafts(next);
      persist(next);
    },
    [activityId, drafts]
  );

  const listDrafts = React.useCallback(() => drafts, [drafts]);

  const restoreDraft = React.useCallback(
    (id: string): AutosaveDraft | null => {
      const found = drafts.find((d) => d.id === id) || null;
      return found || null;
    },
    [drafts]
  );

  const clearOld = React.useCallback(() => {
    const next = drafts.slice(0, MAX_DRAFTS);
    setDrafts(next);
    persist(next);
  }, [drafts]);

  return { drafts, error, saveDraft, listDrafts, restoreDraft, clearOld } as const;
}
