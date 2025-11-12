import * as React from "react";
import type { GroupPermissionsDTO, UUID } from "@/types";
import { getGroupPermissions } from "./api.client";

interface UseGroupPermissionsState {
  loading: boolean;
  error?: string;
  errorCode?: string;
  errorStatus?: number;
  data?: GroupPermissionsDTO;
}

export function useGroupPermissions(groupId: UUID) {
  const [state, setState] = React.useState<UseGroupPermissionsState>({ loading: true });

  const fetchPermissions = React.useCallback(async () => {
    if (!groupId) {
      setState({ loading: false, error: "Brak identyfikatora grupy" });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: undefined, errorCode: undefined, errorStatus: undefined }));
    try {
      const res = await getGroupPermissions(groupId);
      if ("error" in res) {
        setState({
          loading: false,
          error: res.error.message,
          errorCode: res.error.code,
          errorStatus: undefined,
          data: undefined,
        });
      } else {
        setState({ loading: false, data: res.data, error: undefined, errorCode: undefined, errorStatus: undefined });
      }
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      const code: string | undefined = e?.body?.error?.code;
      const status: number | undefined = e?.status;
      setState({ loading: false, error: message, errorCode: code, errorStatus: status, data: undefined });
    }
  }, [groupId]);

  React.useEffect(() => {
    void fetchPermissions();
  }, [fetchPermissions]);

  return {
    loading: state.loading,
    error: state.error,
    errorCode: state.errorCode,
    errorStatus: state.errorStatus,
    permissions: state.data,
    refresh: fetchPermissions,
  } as const;
}
