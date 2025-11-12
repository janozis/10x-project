import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { UUID } from "@/types";

export interface TaskRow {
  id: UUID;
  group_id: UUID;
  activity_id: UUID | null;
  title: string;
  description: string;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: TaskRow | null;
  old: TaskRow | null;
}

export function useRealtimeTasks(groupId: UUID, onEvent: (payload: TaskRealtimePayload) => void): void {
  React.useEffect(() => {
    if (!groupId) return;

    // Skip realtime if Supabase client is not available
    if (!supabaseClient) {
      console.warn("[useRealtimeTasks] Supabase client not available, skipping realtime subscription");
      return;
    }

    const channel = supabaseClient
      .channel(`group_tasks:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_tasks", filter: `group_id=eq.${groupId}` },
        (payload: any) => {
          const evt: TaskRealtimePayload = {
            eventType: payload.eventType,
            new: (payload.new ?? null) as TaskRow | null,
            old: (payload.old ?? null) as TaskRow | null,
          };
          onEvent(evt);
        }
      )
      .subscribe((status) => {
        // no-op; could log status if needed
      });

    return () => {
      try {
        supabaseClient.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [groupId, onEvent]);
}
