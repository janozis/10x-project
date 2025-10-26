import type { APIRoute } from "astro";
import { errors } from "../../../../lib/errors";
import { statusForErrorCode } from "../../../../lib/http/status";
import { restoreActivity } from "../../../../lib/services/activities.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";

export const prerender = false;

// POST /api/activities/[activity_id]/restore
export const POST: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const activityId = ctx.params.activity_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });

  const result = await restoreActivity(supabase, userId, activityId);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};
