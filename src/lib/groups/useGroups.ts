import * as React from "react";
import type { GroupDTO } from "@/types";
import { listGroups } from "./api.client";

interface UseGroupsState {
  loading: boolean;
  error?: string;
  errorCode?: string;
  errorStatus?: number;
  items: GroupDTO[];
  nextCursor?: string;
  loadingMore?: boolean;
}

export function useGroups(options?: { showDeleted?: boolean }) {
  const [state, setState] = React.useState<UseGroupsState>({ loading: true, items: [] });

  const fetchList = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined, errorCode: undefined, errorStatus: undefined }));
    try {
      const res = await listGroups({ showDeleted: !!options?.showDeleted });
      if ("error" in res) {
        setState({
          loading: false,
          error: res.error.message,
          errorCode: res.error.code,
          errorStatus: undefined,
          items: [],
        });
      } else {
        setState({
          loading: false,
          items: res.data,
          error: undefined,
          errorCode: undefined,
          errorStatus: undefined,
          nextCursor: (res as any).nextCursor,
        });
      }
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      const code: string | undefined = e?.body?.error?.code;
      const status: number | undefined = e?.status;
      setState({ loading: false, error: message, errorCode: code, errorStatus: status, items: [] });
    }
  }, [options?.showDeleted]);

  React.useEffect(() => {
    void fetchList();
  }, [fetchList]);

  return {
    loading: state.loading,
    error: state.error,
    errorCode: state.errorCode,
    errorStatus: state.errorStatus,
    items: state.items,
    hasMore: !!state.nextCursor,
    refresh: fetchList,
    mutate: (updater: (prev: GroupDTO[]) => GroupDTO[]) => setState((s) => ({ ...s, items: updater(s.items) })),
    loadMore: async () => {
      if (!state.nextCursor || state.loadingMore) return;
      setState((s) => ({ ...s, loadingMore: true }));
      try {
        const res = await listGroups({ showDeleted: !!options?.showDeleted, cursor: state.nextCursor });
        if ("error" in res) {
          setState((s) => ({ ...s, loadingMore: false }));
          return { ok: false as const };
        }
        setState((s) => ({
          ...s,
          items: [...s.items, ...res.data],
          nextCursor: (res as any).nextCursor,
          loadingMore: false,
        }));
        return { ok: true as const };
      } catch {
        setState((s) => ({ ...s, loadingMore: false }));
        return { ok: false as const };
      }
    },
  } as const;
}
