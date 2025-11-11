import * as React from "react";
import type { UUID, GroupDTO } from "@/types";
import { restoreGroup } from "./api.client";

export function useRestoreGroup() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const restore = React.useCallback(
    async (groupId: UUID): Promise<{ ok: true; data?: GroupDTO } | { ok: false; error: Error }> => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await restoreGroup(groupId);
        if ("error" in res) {
          setError(res.error.message);
          return { ok: false as const, error: res.error };
        }
        return { ok: true as const, data: res.data };
      } catch (e: unknown) {
        const message: string = e?.body?.error?.message || e?.message || "Request failed";
        setError(message);
        return { ok: false as const, error: { message } } as const;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { restore, loading, error } as const;
}
