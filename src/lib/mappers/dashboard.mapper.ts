import type { GroupDashboardDTO, TimestampISO, UUID } from "../../types";
import type { Tables } from "../../db/database.types";

type DashboardStatsRow = Tables<"group_dashboard_stats">;

// Partial activity row with only fields needed for recent activity feed
interface ActivityRowPartial {
  id: string;
  group_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

interface RecentActivityItem {
  type: string;
  id: UUID;
  at: TimestampISO;
  user_id: UUID;
}

/**
 * Maps dashboard stats view row and recent activities to GroupDashboardDTO.
 *
 * Transforms:
 * - Stats aggregations from view (total_activities, evaluated_activities, etc.)
 * - Recent activities into feed items (activity_created, activity_updated events)
 *
 * For each activity, generates:
 * - "activity_created" event with created_at timestamp
 * - "activity_updated" event (if updated_at differs from created_at)
 *
 * All events are sorted by timestamp DESC and limited to match requested limit.
 *
 * @param statsRow - Row from group_dashboard_stats view
 * @param recentActivities - Recent activities ordered by created_at DESC
 * @returns Mapped GroupDashboardDTO with stats and recent_activity feed
 */
export function mapDashboardStatsToDTO(
  statsRow: DashboardStatsRow,
  recentActivities: ActivityRowPartial[]
): GroupDashboardDTO {
  const recent_activity: RecentActivityItem[] = recentActivities.flatMap((activity) => {
    const items: RecentActivityItem[] = [];

    // Activity created event
    items.push({
      type: "activity_created",
      id: activity.id,
      at: activity.created_at,
      user_id: activity.created_by,
    });

    // Activity updated event (if updated after creation)
    if (activity.updated_at !== activity.created_at && activity.updated_by) {
      items.push({
        type: "activity_updated",
        id: activity.id,
        at: activity.updated_at,
        user_id: activity.updated_by,
      });
    }

    return items;
  });

  // Sort by timestamp DESC and take most recent
  recent_activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    group_id: statsRow.group_id as UUID,
    total_activities: statsRow.total_activities ?? 0,
    evaluated_activities: statsRow.evaluated_activities ?? 0,
    pct_evaluated_above_7: statsRow.pct_evaluated_above_7 ?? 0,
    tasks: {
      pending: statsRow.tasks_pending ?? 0,
      done: statsRow.tasks_done ?? 0,
    },
    recent_activity: recent_activity.slice(0, 10), // Final limit after merging events
  };
}
