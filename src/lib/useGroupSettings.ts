import * as React from "react";
import type { GroupDTO, GroupPermissionsDTO, UUID, GroupUpdateCommand, GroupStatus } from "@/types";
import {
  getGroupPermissions,
  getGroup,
  patchGroup,
  rotateInvite,
  deleteGroup,
  restoreGroup,
} from "@/lib/groups/api.client";

interface GroupSettingsState {
  loading: boolean;
  error?: string;
  errorCode?: string;
  errorStatus?: number;
  group?: GroupDTO;
  permissions?: GroupPermissionsDTO;
  cooldownUntil?: number;
}

export function useGroupSettings(groupId: UUID) {
  const [state, setState] = React.useState<GroupSettingsState>({ loading: true });

  const fetchAll = React.useCallback(async () => {
    if (!groupId) {
      setState({ loading: false, error: "Brak identyfikatora grupy" });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: undefined, errorCode: undefined, errorStatus: undefined }));
    try {
      const [groupRes, permsRes] = await Promise.all([getGroup(groupId), getGroupPermissions(groupId)]);

      const next: GroupSettingsState = { loading: false };

      if ("data" in groupRes) {
        next.group = groupRes.data;
      } else if ("error" in groupRes) {
        const err = groupRes.error;
        next.error = err.message;
        next.errorCode = err.code;
      }

      if ("data" in permsRes) {
        next.permissions = permsRes.data;
      } // perms error is non-fatal for rendering basic settings shell

      setState(next);
    } catch (e: unknown) {
      const message: string = e?.body?.error?.message || e?.message || "Request failed";
      const code: string | undefined = e?.body?.error?.code;
      const status: number | undefined = e?.status;
      setState({ loading: false, error: message, errorCode: code, errorStatus: status });
    }
  }, [groupId]);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    loading: state.loading,
    error: state.error,
    errorCode: state.errorCode,
    errorStatus: state.errorStatus,
    group: state.group,
    permissions: state.permissions,
    cooldownUntil: state.cooldownUntil,
    refresh: fetchAll,
    async saveDetails(changes: GroupUpdateCommand) {
      if (!groupId) return;
      const res = await patchGroup(groupId, changes);
      if ("data" in res) {
        setState((s) => ({ ...s, group: res.data }));
        return true;
      } else if ("error" in res) {
        setState((s) => ({ ...s, error: res.error.message, errorCode: res.error.code }));
        return false;
      }
      return false;
    },
    async toggleArchive() {
      const current = state.group;
      if (!current) return;
      const nextStatus: GroupStatus = current.status === "archived" ? "active" : "archived";
      const res = await patchGroup(groupId, { status: nextStatus });
      if ("data" in res) {
        setState((s) => ({ ...s, group: res.data }));
        return true;
      } else if ("error" in res) {
        setState((s) => ({ ...s, error: res.error.message, errorCode: res.error.code }));
        return false;
      }
      return false;
    },
    async rotateInvite() {
      if (!groupId) return;
      try {
        const res = await rotateInvite(groupId);
        if ("data" in res) {
          setState((s) => ({ ...s, group: res.data }));
          return true;
        } else if ("error" in res) {
          setState((s) => ({ ...s, error: res.error.message, errorCode: res.error.code }));
          return false;
        }
      } catch (e: unknown) {
        const retryAfterMs: number | undefined = e?.retryAfterMs;
        if (typeof retryAfterMs === "number") {
          setState((s) => ({ ...s, cooldownUntil: Date.now() + retryAfterMs }));
        }
        const message: string = e?.body?.error?.message || e?.message || "Request failed";
        setState((s) => ({ ...s, error: message }));
        return false;
      }
      return false;
    },
    async softDelete() {
      if (!groupId) return false;
      const res = await deleteGroup(groupId);
      if ("data" in res) {
        return true;
      } else if ("error" in res) {
        setState((s) => ({ ...s, error: res.error.message, errorCode: res.error.code }));
        return false;
      }
      return false;
    },
    async restore() {
      if (!groupId) return false;
      const res = await restoreGroup(groupId);
      if ("data" in res) {
        setState((s) => ({ ...s, group: res.data }));
        return true;
      } else if ("error" in res) {
        setState((s) => ({ ...s, error: res.error.message, errorCode: res.error.code }));
        return false;
      }
      return false;
    },
  } as const;
}
