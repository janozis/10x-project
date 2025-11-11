import type { APIRoute } from "astro";
import { errors } from "../../../../lib/errors";
import { statusForErrorCode } from "../../../../lib/http/status";
import { activityCreateSchema, activityListQuerySchema, zodErrorToDetails } from "../../../../lib/validation/activity";
import { createActivity, listActivities } from "../../../../lib/services/activities.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client"; // Fallback until real auth

export const prerender = false;

// GET /api/groups/[group_id]/activities
export const GET: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const groupId = ctx.params.group_id || "";
  if (!supabase) {
    const err = errors.internal(
      "Supabase client not available. Check server-side environment variables (SUPABASE_URL, SUPABASE_KEY) or PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY"
    );
    return new Response(JSON.stringify(err), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse query params
  const qp = Object.fromEntries(new URL(ctx.request.url).searchParams.entries());
  const parseResult = activityListQuerySchema.safeParse(qp);
  if (!parseResult.success) {
    const err = errors.validation(zodErrorToDetails(parseResult.error));
    return new Response(JSON.stringify(err), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[GET /api/groups/[group_id]/activities] Request:", { groupId, userId, filters: parseResult.data });
  }
  const result = await listActivities(supabase, userId, groupId, parseResult.data);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[GET /api/groups/[group_id]/activities] Result:", {
      hasError: "error" in result,
      errorCode: "error" in result ? result.error.code : undefined,
      dataLength: "data" in result ? result.data?.length : undefined,
    });
  }
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: statusForErrorCode(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// POST /api/groups/[group_id]/activities
export const POST: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const groupId = ctx.params.group_id || "";
  if (!supabase) {
    const err = errors.internal("Supabase client not available");
    return new Response(JSON.stringify(err), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await ctx.request.json();
  } catch {
    const err = errors.validation({ body: "Invalid or missing JSON" });
    return new Response(JSON.stringify(err), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = activityCreateSchema.safeParse(jsonBody);
  if (!parsed.success) {
    const err = errors.validation(zodErrorToDetails(parsed.error));
    return new Response(JSON.stringify(err), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await createActivity(supabase, userId, groupId, parsed.data);
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: statusForErrorCode(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
