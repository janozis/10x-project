import * as React from "react";
import type { ActivityDTO, ApiSingle, UUID } from "@/types";
import type { ActivitySummaryVM } from "@/lib/camp-days/types";

export function useActivitySummaries() {
  const cacheRef = React.useRef<Map<UUID, ActivitySummaryVM>>(new Map());

  const get = React.useCallback((id: UUID): ActivitySummaryVM | undefined => cacheRef.current.get(id), []);

  const load = React.useCallback(async (ids: UUID[]) => {
    const missing = ids.filter((id) => !cacheRef.current.has(id));
    if (!missing.length) return cacheRef.current;
    const results = await Promise.allSettled(
      missing.map(async (id) => {
        const res = await fetch(`/api/activities/${id}`);
        if (!res.ok) return null;
        const body = (await res.json()) as ApiSingle<ActivityDTO>;
        return { id, title: body.data.title, status: body.data.status } as ActivitySummaryVM;
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        cacheRef.current.set(r.value.id, r.value);
      }
    }
    return cacheRef.current;
  }, []);

  return { get, load } as const;
}


