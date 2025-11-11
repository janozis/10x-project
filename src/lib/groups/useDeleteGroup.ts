import * as React from "react";
import type { UUID } from "@/types";
import { deleteGroup } from "./api.client";

export function useDeleteGroup() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const remove = React.useCallback(async (groupId: UUID) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await deleteGroup(groupId);
      if ("error" in res) {
        setError(res.error.message);
        return { ok: false as const, error: res.error };
      }
      return { ok: true as const };
    } catch (e: unknown) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      setError(message);
      return { ok: false as const, error: { message } } as const;
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error } as const;
}
