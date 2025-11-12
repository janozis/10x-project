import * as React from "react";
import type { ActivityEditorDTO, UUID } from "@/types";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { headers: { "Content-Type": "application/json" }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error?.message || "Request failed"), { status: res.status, body });
  return body as T;
}

export function useEditors(activityId: UUID) {
  const [items, setItems] = React.useState<ActivityEditorDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const list = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<{ data: ActivityEditorDTO[] }>(`/api/activities/${activityId}/editors`);
      setItems(res.data);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  React.useEffect(() => {
    void list();
  }, [list]);

  const assign = React.useCallback(
    async (userId: UUID) => {
      await fetchJson(`/api/activities/${activityId}/editors`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      await list();
    },
    [activityId, list]
  );

  const remove = React.useCallback(
    async (userId: UUID) => {
      await fetchJson(`/api/activities/${activityId}/editors/${userId}`, { method: "DELETE" });
      await list();
    },
    [activityId, list]
  );

  return { items, loading, error, list, assign, remove } as const;
}
