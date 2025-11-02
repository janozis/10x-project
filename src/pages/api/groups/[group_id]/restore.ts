import type { APIRoute } from "astro";
import { errors } from "@/lib/errors";
import { restoreGroupById } from "@/lib/services/groups.service";

export const prerender = false;

function mapErrorCodeToHttpStatus(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "DATE_RANGE_INVALID":
    case "GROUP_LIMIT_REACHED":
    case "BAD_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RATE_LIMIT_EXCEEDED":
      return 429;
    default:
      return 500;
  }
}

export const POST: APIRoute = async (context) => {
  const groupId = context.params.group_id;
  if (!groupId) {
    return new Response(JSON.stringify(errors.badRequest("Missing group_id")), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supabase = context.locals.supabase;
  if (!supabase) {
    return new Response(JSON.stringify(errors.internal("Supabase client not available")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const userId = context.locals.user?.id;
  const result = await restoreGroupById(supabase, userId, groupId);
  if ("error" in result) {
    const status = mapErrorCodeToHttpStatus(result.error.code);
    return new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};


