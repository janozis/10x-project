import type { APIRoute } from "astro";
import { errors } from "@/lib/errors";
import { joinGroupByCode } from "@/lib/services/groups.service";

export const prerender = false;

function mapErrorCodeToHttpStatus(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
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
  let jsonBody: unknown;
  try {
    jsonBody = await context.request.json();
  } catch {
    return new Response(JSON.stringify(errors.validation({ body: "Invalid or missing JSON" })), {
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
  const result = await joinGroupByCode(supabase, userId, jsonBody);
  if ("error" in result) {
    // Special-case INVITE_* codes exposed via details.code
    const code = (result.error.details as any)?.code ?? result.error.code;
    const status = mapErrorCodeToHttpStatus(code);
    return new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};


