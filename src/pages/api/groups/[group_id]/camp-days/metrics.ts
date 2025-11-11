import type { APIRoute } from "astro";
import { errors } from "../../../../../lib/errors";
import { jsonResponse } from "../../../../../lib/http/response";
import type { ApiList, UUID } from "../../../../../types";

export const prerender = false;

interface CampDayMetricsDTO {
  camp_day_id: UUID;
  slots_count: number;
  total_minutes: number;
}

/**
 * GET /api/groups/[group_id]/camp-days/metrics
 * Returns aggregated metrics (slot count and total duration) for all camp days in a group
 */
export const GET: APIRoute = async ({ locals, params }) => {
  const { supabase, user } = locals;
  const groupId = params.group_id;

  if (!supabase) {
    return jsonResponse(errors.internal("Supabase client not available"), { status: 500 });
  }

  if (!groupId) {
    return jsonResponse(errors.validation({ group_id: "Required" }), { status: 400 });
  }

  if (!user?.id) {
    return jsonResponse(errors.unauthorized(), { status: 401 });
  }

  // Verify user is member of the group
  const { data: membership, error: membershipError } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return jsonResponse(errors.forbidden(), { status: 403 });
  }

  // Get all camp days for this group
  const { data: campDays, error: campDaysError } = await supabase
    .from("camp_days")
    .select("id")
    .eq("group_id", groupId)
    .order("day_number", { ascending: true });

  if (campDaysError) {
    console.error("[camp-days/metrics] Error fetching camp days:", campDaysError);
    return jsonResponse(errors.internal("Failed to fetch camp days"), { status: 500 });
  }

  if (!campDays || campDays.length === 0) {
    return jsonResponse({ data: [] } satisfies ApiList<CampDayMetricsDTO>, { status: 200 });
  }

  // Get aggregated metrics for all camp days using SQL aggregation
  // This is much more efficient than fetching schedules for each day separately
  const { data: metrics, error: metricsError } = await supabase
    .from("activity_schedules")
    .select("camp_day_id, start_time, end_time")
    .in(
      "camp_day_id",
      campDays.map((cd) => cd.id)
    );

  if (metricsError) {
    console.error("[camp-days/metrics] Error fetching metrics:", metricsError);
    return jsonResponse(errors.internal("Failed to fetch metrics"), { status: 500 });
  }

  // Aggregate metrics by camp_day_id
  const aggregateMap = new Map<UUID, { slots_count: number; total_minutes: number }>();

  // Initialize all camp days with zero counts
  for (const day of campDays) {
    aggregateMap.set(day.id, { slots_count: 0, total_minutes: 0 });
  }

  // Aggregate the schedules
  if (metrics) {
    for (const schedule of metrics) {
      const existing = aggregateMap.get(schedule.camp_day_id);
      if (existing) {
        existing.slots_count += 1;

        // Calculate duration in minutes
        const duration = calculateMinutesBetween(schedule.start_time, schedule.end_time);
        existing.total_minutes += duration;
      }
    }
  }

  // Convert map to array
  const result: CampDayMetricsDTO[] = Array.from(aggregateMap.entries()).map(
    ([camp_day_id, { slots_count, total_minutes }]) => ({
      camp_day_id,
      slots_count,
      total_minutes,
    })
  );

  return jsonResponse({ data: result } satisfies ApiList<CampDayMetricsDTO>, { status: 200 });
};

/**
 * Calculate minutes between two HH:MM time strings
 */
function calculateMinutesBetween(start: string, end: string): number {
  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return Math.max(0, endMinutes - startMinutes);
}
