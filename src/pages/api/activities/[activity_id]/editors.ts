import type { APIRoute } from "astro";
import { errors } from "../../../../lib/errors";
import { assignEditorSchema, isUuid } from "../../../../lib/validation/activityEditor";
import { listEditors, assignEditor } from "../../../../lib/services/activity-editors.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";

export const prerender = false;

// GET /api/activities/[activity_id]/editors
export const GET: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";

  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });
  if (!isUuid(activityId))
    return new Response(JSON.stringify(errors.validation({ activity_id: "Invalid UUID" })), { status: 400 });

  const result = await listEditors(supabase, activityId, userId);
  if ("error" in result)
    return new Response(JSON.stringify(result), { status: mapEditorErrorToStatus(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};

// POST /api/activities/[activity_id]/editors
export const POST: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";

  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });
  if (!isUuid(activityId))
    return new Response(JSON.stringify(errors.validation({ activity_id: "Invalid UUID" })), { status: 400 });

  let jsonBody: unknown;
  try {
    jsonBody = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify(errors.validation({ body: "Invalid or missing JSON" })), { status: 400 });
  }

  const parsed = assignEditorSchema.safeParse(jsonBody);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return new Response(JSON.stringify(errors.validation(fieldErrors)), { status: 400 });
  }

  const { user_id } = parsed.data;
  const result = await assignEditor(supabase, activityId, user_id, userId);
  if ("error" in result)
    return new Response(JSON.stringify(result), { status: mapEditorErrorToStatus(result.error.code) });
  return new Response(JSON.stringify(result), { status: 201 });
};

function mapEditorErrorToStatus(code: string): number {
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
    case "ALREADY_ASSIGNED":
    case "CONFLICT":
      return 409;
    default:
      return 500;
  }
}
