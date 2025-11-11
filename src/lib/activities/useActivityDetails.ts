import * as React from "react";
import type {
  ActivityDTO,
  ActivityEditorDTO,
  AIEvaluationDTO,
  GroupPermissionsDTO,
  UUID,
  ApiList,
  ApiSingle,
} from "@/types";
import { supabaseClient } from "@/db/supabase.client";
import { getActivity, listActivityEditors, listActivityAIEvaluations } from "./api.client";
import { getGroupPermissions } from "@/lib/groups/api.client";
import { useCooldown } from "./useCooldown";
import { statusForErrorCode } from "@/lib/http/status";

export interface AIEvaluationPostResponse {
  data: { queued: boolean; next_poll_after_sec: number };
}

export interface PermissionsComputed {
  canEdit: boolean;
  canRequestEvaluation: boolean;
}

export interface ActivityDetailsViewModel {
  activity: ActivityDTO;
  editors: ActivityEditorDTO[];
  evaluations: AIEvaluationDTO[];
  latestEvaluation: AIEvaluationDTO | null;
  permissions: GroupPermissionsDTO;
  computed: PermissionsComputed;
  cooldownRemainingSec: number;
  isEvaluationStale: boolean;
}

interface State {
  loading: boolean;
  error?: string;
  errorCode?: string;
  errorStatus?: number;
  vm?: ActivityDetailsViewModel;
}

export function useActivityDetails(activityId: UUID) {
  const [state, setState] = React.useState<State>({ loading: true });

  const refresh = React.useCallback(async () => {
    if (!activityId) {
      setState({ loading: false, error: "Brak identyfikatora aktywności" });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: undefined, errorCode: undefined, errorStatus: undefined }));
    try {
      const [{ data: act }, currentUser] = await Promise.all([
        getActivity(activityId).then((res) => {
          if ("error" in res) {
            const code = res.error.code as string;
            const status = statusForErrorCode(code);
            throw Object.assign(new Error(res.error.message), { status, body: res, code });
          }
          return res as ApiSingle<ActivityWithEditorsDTO>;
        }),
        supabaseClient.auth.getUser().then((r) => r.data.user || null),
      ]);

      const activity = act as unknown as ActivityDTO & { group_id: UUID };
      const groupId = activity.group_id;

      const [editorsRes, evalsRes, permsRes] = await Promise.all([
        listActivityEditors(activityId),
        listActivityAIEvaluations(activityId),
        getGroupPermissions(groupId),
      ]);

      const editors = "data" in editorsRes ? (editorsRes as ApiList<ActivityEditorDTO>).data : [];
      const evaluations = "data" in evalsRes ? (evalsRes as ApiList<AIEvaluationDTO>).data : [];
      let permissions: GroupPermissionsDTO | undefined = undefined;
      if ("data" in permsRes) permissions = (permsRes as ApiSingle<GroupPermissionsDTO>).data;

      const latestEvaluation = evaluations[0] ?? null;
      const isEvaluationStale = latestEvaluation
        ? new Date(latestEvaluation.created_at) < new Date(activity.updated_at)
        : false;
      const currentUserId = currentUser?.id || undefined;
      const isAssigned = currentUserId ? editors.some((e) => e.user_id === currentUserId) : false;
      const canEdit =
        !!permissions &&
        (permissions.role === "admin" ||
          permissions.can_edit_all ||
          (permissions.can_edit_assigned_only && isAssigned));
      const canRequestEvaluation = canEdit;

      const cooldownRemainingSecDirect = activity.last_evaluation_requested_at
        ? Math.max(
            0,
            Math.ceil((new Date(activity.last_evaluation_requested_at).getTime() + 300000 - Date.now()) / 1000)
          )
        : 0;

      const vm: ActivityDetailsViewModel = {
        activity,
        editors,
        evaluations,
        latestEvaluation,
        permissions:
          permissions ??
          ({
            group_id: groupId,
            role: "member",
            can_edit_all: false,
            can_edit_assigned_only: false,
          } as GroupPermissionsDTO),
        computed: { canEdit, canRequestEvaluation },
        cooldownRemainingSec: cooldownRemainingSecDirect,
        isEvaluationStale,
      };

      setState({ loading: false, vm });
    } catch (e: unknown) {
      const msg: string = e?.body?.error?.message || e?.message || "Request failed";
      const code: string | undefined = e?.body?.error?.code || e?.code;
      const status: number | undefined = e?.status;
      setState({ loading: false, error: msg, errorCode: code, errorStatus: status });
    }
  }, [activityId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const cooldown = useCooldown(state.vm?.activity.last_evaluation_requested_at, 300);

  const vmWithCooldown = React.useMemo(() => {
    if (!state.vm) return undefined;
    return { ...state.vm, cooldownRemainingSec: cooldown } as ActivityDetailsViewModel;
  }, [state.vm, cooldown]);

  return {
    loading: state.loading,
    error: state.error,
    errorCode: state.errorCode,
    errorStatus: state.errorStatus,
    vm: vmWithCooldown,
    refresh,
  } as const;
}
