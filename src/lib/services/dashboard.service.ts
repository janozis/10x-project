import type { SupabaseClient } from "../../db/supabase.client";
import type { GroupDashboardDTO, ApiResponse, UUID } from "../../types";
import { errors } from "../errors";
import { mapDashboardStatsToDTO } from "../mappers/dashboard.mapper";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4.
 */
function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Returns effective user ID with fallback to DEFAULT_USER_ID.
 * Used for development when no session is available.
 */
function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

/**
 * Fetch user's role in group via user_group_permissions view.
 * Returns null if user is not a member or query fails.
 *
 * @param supabase - Supabase client instance
 * @param groupId - Group UUID
 * @param userId - User UUID
 * @returns Object with role (null if not a member or error)
 */
async function fetchUserGroupPermissions(
  supabase: SupabaseClient,
  groupId: UUID,
  userId: UUID
): Promise<{ role: string | null }> {
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { role: null };
  return { role: data?.role ?? null };
}

/**
 * Get dashboard stats and recent activity feed for a group.
 *
 * Authorization: Requires caller to be a member (any role: admin, editor, member).
 * Returns 404 if user is not a member or group doesn't exist (security by obscurity).
 *
 * Flow:
 * 1. Validate group_id format (UUID)
 * 2. Verify caller's membership via user_group_permissions view
 * 3. Fetch aggregated stats from group_dashboard_stats view
 * 4. Fetch recent activities (limited by recentLimit)
 * 5. Map to DTO with recent_activity feed
 *
 * @param supabase - Supabase client from context.locals
 * @param groupId - Group UUID from path parameter
 * @param userId - Authenticated user ID (or undefined for dev fallback)
 * @param recentLimit - Number of recent activities to fetch (1-50, default 10)
 * @returns ApiResponse with GroupDashboardDTO or ApiError
 *
 * @example
 * ```typescript
 * const result = await getDashboard(supabase, groupId, userId, 10);
 * if ("error" in result) {
 *   return errorResponse(result);
 * }
 * return successResponse(result.data);
 * ```
 */
export async function getDashboard(
  supabase: SupabaseClient,
  groupId: string,
  userId: UUID | undefined,
  recentLimit = 10
): Promise<ApiResponse<GroupDashboardDTO>> {
  const actorUserId = effectiveUserId(userId);

  // 1. Validate group_id format
  if (!isUUID(groupId)) {
    return errors.validation({ group_id: "invalid uuid" });
  }

  // 2. Verify membership
  const { role } = await fetchUserGroupPermissions(supabase, groupId as UUID, actorUserId);
  if (!role) {
    return errors.notFound("Group");
  }

  // 3. Fetch dashboard stats from view
  const { data: statsRow, error: statsError } = await supabase
    .from("group_dashboard_stats")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  if (statsError) {
    return errors.internal("Failed to fetch dashboard stats");
  }

  // If no stats row, group might have no activities yet - return zeros
  if (!statsRow) {
    return {
      data: {
        group_id: groupId as UUID,
        total_activities: 0,
        evaluated_activities: 0,
        pct_evaluated_above_7: 0,
        tasks: { pending: 0, done: 0 },
        recent_activity: [],
      },
    };
  }

  // 4. Fetch recent activities
  const { data: recentActivities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, group_id, created_at, created_by, updated_at, updated_by")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(recentLimit);

  if (activitiesError) {
    return errors.internal("Failed to fetch recent activities");
  }

  // 5. Map to DTO
  const dto = mapDashboardStatsToDTO(statsRow, recentActivities ?? []);

  return { data: dto };
}
