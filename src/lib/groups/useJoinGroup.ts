import * as React from "react";
import { joinGroup } from "./api.client";

export function useJoinGroup() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [joined, setJoined] = React.useState<boolean>(false);

  const submit = React.useCallback(async (code: string) => {
    setLoading(true);
    setError(undefined);
    setJoined(false);
    try {
      const res = await joinGroup(code);
      if ("error" in res) {
        setError(res.error.message);
        return { ok: false as const, error: res.error };
      }
      setJoined(true);
      return { ok: true as const };
    } catch (e: unknown) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      setError(message);
      return { ok: false as const, error: { message } } as const;
    } finally {
      setLoading(false);
    }
  }, []);

  return { join: submit, loading, error, joined } as const;
}
