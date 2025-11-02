import type { APIRoute } from "astro";
import { errors } from "@/lib/errors";
import { rotateGroupInvite } from "@/lib/services/groups.service";

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
    case "FORBIDDEN_ROLE":
      return 403;
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
  const result = await rotateGroupInvite(supabase, context.locals.user?.id, groupId);
  if ("error" in result) {
    const status = mapErrorCodeToHttpStatus(result.error.code);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // If service populates details.retryAfterSec we can expose Retry-After
    const retryAfterSec = (result as any)?.error?.details?.retryAfterSec;
    if (status === 429 && typeof retryAfterSec === "number") {
      headers["Retry-After"] = String(retryAfterSec);
    }
    return new Response(JSON.stringify(result), { status, headers });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};


