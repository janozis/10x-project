import type { APIRoute } from "astro";
import { errors } from "../../../lib/errors";
import { statusForErrorCode } from "../../../lib/http/status";
import { activityUpdateSchema, zodErrorToDetails } from "../../../lib/validation/activity";
import { getActivity, updateActivity, softDeleteActivity } from "../../../lib/services/activities.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";

export const prerender = false;

// GET /api/activities/[activity_id]
export const GET: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });

  const result = await getActivity(supabase, userId, activityId);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};

// PATCH /api/activities/[activity_id]
export const PATCH: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });

  let jsonBody: unknown;
  try {
    jsonBody = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify(errors.validation({ body: "Invalid or missing JSON" })), { status: 400 });
  }

  const parsed = activityUpdateSchema.safeParse(jsonBody);
  if (!parsed.success) {
    const err = errors.validation(zodErrorToDetails(parsed.error));
    return new Response(JSON.stringify(err), { status: 400 });
  }

  const result = await updateActivity(supabase, userId, activityId, parsed.data);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};

// DELETE /api/activities/[activity_id]
export const DELETE: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });

  const result = await softDeleteActivity(supabase, userId, activityId);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};
