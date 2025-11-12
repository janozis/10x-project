import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { UUID, GroupDashboardDTO } from "@/types";
import type { RealtimeStatus } from "@/lib/dashboard/activity-feed.types";

type FeedEvent = GroupDashboardDTO["recent_activity"][number];

interface Options {
  onInvalidate?: () => void;
  onEvent?: (event: FeedEvent) => void;
  debounceMs?: number;
}

/**
 * Subscribes to Supabase realtime events for dashboard-related tables and
 * notifies via onInvalidate (debounced) and optionally onEvent for feed updates.
 */
export function useDashboardRealtime(groupId: UUID, options: Options = {}) {
  const { onInvalidate, onEvent, debounceMs = 800 } = options;
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<RealtimeStatus>("off");

  // Debounced invalidation
  const invalidateRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerInvalidate = React.useCallback(() => {
    if (!onInvalidate) return;
    if (invalidateRef.current) clearTimeout(invalidateRef.current);
    invalidateRef.current = setTimeout(() => {
      onInvalidate();
    }, debounceMs);
  }, [onInvalidate, debounceMs]);

  React.useEffect(() => {
    // Skip realtime if Supabase client is not available
    if (!supabaseClient) {
      console.warn("[useDashboardRealtime] Supabase client not available, skipping realtime subscription");
      setConnectionStatus("off");
      return;
    }

    // Channel name scoped to group
    const channel = supabaseClient.channel(`dashboard:${groupId}`);

    function emitEvent(ev: FeedEvent) {
      try {
        onEvent?.(ev);
      } catch {
        // ignore
      }
    }

    // activities INSERT -> activity_created
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activities", filter: `group_id=eq.${groupId}` },
      (payload) => {
        const row: any = payload.new;
        emitEvent({ type: "activity_created", id: row.id, at: row.created_at, user_id: row.created_by });
        triggerInvalidate();
      }
    );

    // activities UPDATE -> activity_updated
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "activities", filter: `group_id=eq.${groupId}` },
      (payload) => {
        const row: any = payload.new;
        emitEvent({ type: "activity_updated", id: row.id, at: row.updated_at, user_id: row.updated_by });
        triggerInvalidate();
      }
    );

    // group_tasks INSERT -> task_created
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "group_tasks", filter: `group_id=eq.${groupId}` },
      (payload) => {
        const row: any = payload.new;
        emitEvent({ type: "task_created", id: row.id, at: row.created_at, user_id: row.created_by });
        triggerInvalidate();
      }
    );

    // group_tasks UPDATE -> task_updated or task_done
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "group_tasks", filter: `group_id=eq.${groupId}` },
      (payload) => {
        const row: any = payload.new;
        const type = row.status === "done" ? "task_done" : "task_updated";
        emitEvent({ type, id: row.id, at: row.updated_at, user_id: row.updated_by });
        triggerInvalidate();
      }
    );

    // ai_evaluations INSERT -> invalidate only (optionally push event)
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_evaluations" }, () => {
      // Without ability to filter by group (no direct group_id), we only invalidate
      triggerInvalidate();
    });

    const subscription = channel.subscribe((status) => {
      const isLive = status === "SUBSCRIBED";
      setIsRealtimeConnected(isLive);
      if (status === "SUBSCRIBED") {
        setConnectionStatus("live");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionStatus("reconnecting");
      } else if (status === "CLOSED") {
        setConnectionStatus("off");
      } else {
        // Unknown/initializing statuses treated as reconnecting for UX clarity
        setConnectionStatus("reconnecting");
      }
    });

    return () => {
      if (invalidateRef.current) clearTimeout(invalidateRef.current);
      try {
        supabaseClient.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [groupId, triggerInvalidate, onEvent]);

  return { isRealtimeConnected, connectionStatus } as const;
}
