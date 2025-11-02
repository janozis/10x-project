import * as React from "react";
import type { GroupDTO } from "@/types";
import type { GroupFormValues } from "./types";
import { createGroup } from "./api.client";

export function useCreateGroup() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [created, setCreated] = React.useState<GroupDTO | undefined>(undefined);

  const submit = React.useCallback(async (values: GroupFormValues) => {
    setLoading(true);
    setError(undefined);
    setCreated(undefined);
    try {
      const res = await createGroup(values);
      if ("error" in res) {
        setError(res.error.message);
        return { ok: false as const, error: res.error };
      }
      setCreated(res.data);
      return { ok: true as const, data: res.data };
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      setError(message);
      return { ok: false as const, error: { message } } as const;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create: submit, loading, error, created } as const;
}


