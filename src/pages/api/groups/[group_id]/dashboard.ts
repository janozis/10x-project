import type { APIRoute } from "astro";
import { getDashboard } from "../../../../lib/services/dashboard.service";
import { dashboardQuerySchema } from "../../../../lib/validation/dashboard";
import { statusForErrorCode } from "../../../../lib/http/status";
import { errors } from "../../../../lib/errors";

export const prerender = false;

/**
 * GET /api/groups/{group_id}/dashboard
 *
 * Returns aggregated statistics and recent activity feed for a group.
 *
 * Authorization: User must be a member of the group (any role).
 *
 * Query parameters:
 * - recent_limit (optional): Number of recent activities to fetch (1-50, default: 10)
 *
 * Success response (200):
 * {
 *   "data": {
 *     "group_id": "uuid",
 *     "total_activities": 10,
 *     "evaluated_activities": 8,
 *     "pct_evaluated_above_7": 75.5,
 *     "tasks": { "pending": 3, "done": 7 },
 *     "recent_activity": [
 *       { "type": "activity_created", "id": "uuid", "at": "2025-01-01T10:00:00Z", "user_id": "uuid" }
 *     ]
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid group_id format or recent_limit out of range
 * - 401: Authentication required (production mode)
 * - 404: Group not found or user is not a member
 * - 500: Internal server error (database query failed)
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
  const supabase = locals.supabase;
  const userId = locals.user?.id;
  const groupId = params.group_id;

  // Validate Supabase client availability
  if (!supabase) {
    return new Response(JSON.stringify(errors.internal("Supabase client not available")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate group_id presence
  if (!groupId) {
    return new Response(JSON.stringify(errors.validation({ group_id: "group_id is required" })), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate query parameters
  const recentLimitParam = url.searchParams.get("recent_limit");
  const queryValidation = dashboardQuerySchema.safeParse({
    recent_limit: recentLimitParam ?? undefined, // Convert null to undefined for Zod optional
  });

  if (!queryValidation.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: queryValidation.error.flatten().fieldErrors,
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { recent_limit } = queryValidation.data;

  // Call service layer
  const result = await getDashboard(supabase, groupId, userId, recent_limit);

  // Handle error response
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: statusForErrorCode(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }

  // Success response
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
