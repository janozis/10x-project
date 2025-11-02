import * as React from "react";
import type { ActivityStatus, ActivityWithEditorsDTO, UUID } from "@/types";
import { listActivities } from "./api.client";

export interface ActivitiesListFilters {
  status?: ActivityStatus;
  assigned?: "me";
  search?: string;
}

interface UseInfiniteActivitiesState {
  loading: boolean;
  error?: string;
  errorCode?: string;
  errorStatus?: number;
  items: ActivityWithEditorsDTO[];
  nextCursor?: string;
  loadingMore?: boolean;
  initialized: boolean;
}

export function useInfiniteActivities(options: { groupId: UUID; filters: ActivitiesListFilters; mode?: "active" | "deleted"; limit?: number }) {
  const { groupId, filters, mode = "active", limit = 20 } = options;
  const [state, setState] = React.useState<UseInfiniteActivitiesState>({ loading: true, items: [], initialized: false });

  const fetchPage1 = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined, errorCode: undefined, errorStatus: undefined, initialized: s.initialized }));
    try {
      const res = await listActivities(groupId, { ...filters, limit, deleted: mode === "deleted" ? "only" : undefined });
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[useInfiniteActivities] Response:", { 
          res, 
          hasError: "error" in res, 
          dataLength: "data" in res ? res.data?.length : 0,
          dataType: "data" in res ? typeof res.data : undefined,
          isArray: "data" in res ? Array.isArray(res.data) : undefined,
          fullRes: JSON.stringify(res).substring(0, 500)
        });
      }
      if (!res) {
        setState({ loading: false, error: "No response from server", errorCode: "INTERNAL_ERROR", errorStatus: undefined, items: [], initialized: true });
        return;
      }
      if ("error" in res) {
        setState({ loading: false, error: res.error.message, errorCode: res.error.code, errorStatus: undefined, items: [], initialized: true });
      } else {
        setState({
          loading: false,
          items: res.data || [],
          nextCursor: res.nextCursor,
          error: undefined,
          errorCode: undefined,
          errorStatus: undefined,
          initialized: true,
        });
      }
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      const code: string | undefined = e?.body?.error?.code;
      const status: number | undefined = e?.status;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[useInfiniteActivities] Fetch error:", { message, code, status, error: e });
      }
      setState({ loading: false, error: message, errorCode: code, errorStatus: status, items: [], initialized: true });
    }
  }, [groupId, filters, mode, limit]);

  // Reset and fetch when group/filters change
  React.useEffect(() => {
    void fetchPage1();
  }, [fetchPage1]);

  const loadMore = React.useCallback(async () => {
    if (!state.nextCursor || state.loadingMore) return { ok: false as const };
    setState((s) => ({ ...s, loadingMore: true }));
    try {
      const res = await listActivities(groupId, { ...filters, limit, cursor: state.nextCursor, deleted: mode === "deleted" ? "only" : undefined });
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
  }, [groupId, filters, mode, limit, state.nextCursor, state.loadingMore]);

  return {
    loading: state.loading,
    error: state.error,
    errorCode: state.errorCode,
    errorStatus: state.errorStatus,
    items: state.items,
    hasMore: !!state.nextCursor,
    loadingMore: !!state.loadingMore,
    initialized: state.initialized,
    refresh: fetchPage1,
    loadMore,
    mutate: (updater: (prev: ActivityWithEditorsDTO[]) => ActivityWithEditorsDTO[]) =>
      setState((s) => ({ ...s, items: updater(s.items) })),
  } as const;
}


