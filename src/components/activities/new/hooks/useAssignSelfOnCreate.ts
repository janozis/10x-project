import * as React from "react";
import type { ApiResponse, ActivityEditorDTO, UUID, ApiError } from "@/types";
import { supabaseClient } from "@/db/supabase.client";

export interface AssignResult {
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export function useAssignSelfOnCreate() {
  const assign = React.useCallback(async (activityId: UUID): Promise<AssignResult> => {
    try {
      const { data: userData } = await supabaseClient.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return { ok: false, errorCode: "UNAUTHORIZED", errorMessage: "Brak zalogowanego użytkownika" };

      const res = await fetch(`/api/activities/${activityId}/editors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = (await res.json()) as ApiResponse<ActivityEditorDTO>;
      if (!res.ok || "error" in json) {
        const err = json as ApiError;
        return { ok: false, errorCode: err.error.code, errorMessage: err.error.message };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, errorMessage: e?.message || "Request failed" };
    }
  }, []);

  return { assign } as const;
}
