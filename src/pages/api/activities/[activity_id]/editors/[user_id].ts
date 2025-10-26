import type { APIRoute } from "astro";
import { errors } from "../../../../../lib/errors";
import { removeEditor } from "../../../../../lib/services/activity-editors.service";
import { isUuid } from "../../../../../lib/validation/activityEditor";
import { DEFAULT_USER_ID } from "../../../../../db/supabase.client";

export const prerender = false;

// DELETE /api/activities/[activity_id]/editors/[user_id]
export const DELETE: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const actorUserId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";
  const targetUserId = ctx.params.user_id || "";

  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });
  if (!isUuid(activityId) || !isUuid(targetUserId)) {
    return new Response(
      JSON.stringify(
        errors.validation({
          activity_id: !isUuid(activityId) ? "Invalid UUID" : undefined,
          user_id: !isUuid(targetUserId) ? "Invalid UUID" : undefined,
        })
      ),
      { status: 400 }
    );
  }

  const result = await removeEditor(supabase, activityId, targetUserId, actorUserId);
  if ("error" in result)
    return new Response(JSON.stringify(result), { status: mapEditorDeleteErrorToStatus(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};

function mapEditorDeleteErrorToStatus(code: string): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN_ROLE":
      return 403;
    case "ACTIVITY_NOT_FOUND":
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
    case "BAD_REQUEST":
    case "USER_NOT_IN_GROUP":
      return 400;
    case "CONFLICT":
      return 409;
    default:
      return 500;
  }
}
