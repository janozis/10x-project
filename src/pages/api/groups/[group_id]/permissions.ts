import type { APIRoute } from "astro";
import { getGroupPermissions } from "../../../../lib/services/permissions.service";

export const prerender = false;

/**
 * GET /api/groups/{group_id}/permissions
 * 
 * Returns current user's effective permissions within the group.
 * Queries the user_group_permissions view which aggregates role and permission flags.
 * 
 * Authorization: User must be a member of the group.
 * 
 * Response 200: { "data": { "group_id": "uuid", "role": "editor", "can_edit_all": false, "can_edit_assigned_only": true } }
 * Response 400: Invalid group_id format
 * Response 401: Not authenticated
 * Response 404: User is not a member or group doesn't exist
 * Response 500: Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const { group_id } = params;
  const userId = locals.user?.id;

  // Defensive check (should be handled by middleware)
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }

  // Call service
  const result = await getGroupPermissions(
    locals.supabase,
    group_id!,
    userId
  );

  // Handle errors
  if ("error" in result) {
    const statusMap: Record<string, number> = {
      BAD_REQUEST: 400,
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      INTERNAL_ERROR: 500,
    };
    const status = statusMap[result.error.code] || 500;
    
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Success
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

