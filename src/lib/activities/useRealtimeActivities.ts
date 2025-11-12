import * as React from "react";
import type { ActivityWithEditorsDTO, UUID } from "@/types";
import { supabaseClient } from "@/db/supabase.client";
import { getActivity } from "./api.client";

export interface UseRealtimeActivitiesOptions {
  groupId: UUID;
  enabled?: boolean;
  mode?: "active" | "deleted";
  onUpsert?: (item: ActivityWithEditorsDTO) => void;
  onDelete?: (id: UUID) => void;
}

export function useRealtimeActivities({
  groupId,
  enabled = true,
  mode = "active",
  onUpsert,
  onDelete,
}: UseRealtimeActivitiesOptions) {
  React.useEffect(() => {
    if (!enabled) return;

    // Skip realtime if Supabase client is not available
    if (!supabaseClient) {
      console.warn("[useRealtimeActivities] Supabase client not available, skipping realtime subscription");
      return;
    }

    const channel = supabaseClient
      .channel(`rt-activities-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const id = (payload.new as any)?.id as UUID | undefined;
          if (!id) return;
          // Only relevant for active list; for deleted list inserts won't show as they're not deleted yet
          if (mode === "active") {
            const res = await getActivity(id);
            if ("data" in res && res.data) onUpsert?.(res.data);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "activities", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const id = (payload.new as any)?.id as UUID | undefined;
          if (!id) return;
          const wasDeleted = !!(payload.old as any)?.deleted_at;
          const isDeleted = !!(payload.new as any)?.deleted_at;
          if (isDeleted && !wasDeleted) {
            // Soft-deleted: remove from active list; add to deleted list (cannot fetch deleted via getActivity)
            if (mode === "active") onDelete?.(id);
            // For deleted mode we could trigger a refresh externally
            return;
          }
          if (!isDeleted && wasDeleted) {
            // Restored: remove from deleted list; add/update in active list
            if (mode === "deleted") onDelete?.(id);
            if (mode === "active") {
              const res = await getActivity(id);
              if ("data" in res && res.data) onUpsert?.(res.data);
            }
            return;
          }
          // Regular update: update whichever list is currently shown
          if (mode === "active") {
            const res = await getActivity(id);
            if ("data" in res && res.data) onUpsert?.(res.data);
          }
        }
      )
      // Hard delete unlikely; keep handler for completeness
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "activities", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const id = (payload.old as any)?.id as UUID | undefined;
          if (!id) return;
          onDelete?.(id);
        }
      )
      // Editors assignment changes – no filter by group_id available; we fetch activity if we already track it
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_editors" }, async (payload) => {
        const activityId = (payload.new as any)?.activity_id as UUID | undefined;
        if (!activityId) return;
        if (mode === "active") {
          const res = await getActivity(activityId);
          if ("data" in res && res.data && res.data.group_id === groupId) onUpsert?.(res.data);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "activity_editors" }, async (payload) => {
        const activityId = (payload.old as any)?.activity_id as UUID | undefined;
        if (!activityId) return;
        if (mode === "active") {
          const res = await getActivity(activityId);
          if ("data" in res && res.data && res.data.group_id === groupId) onUpsert?.(res.data);
        }
      })
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [groupId, enabled, mode, onUpsert, onDelete]);
}
