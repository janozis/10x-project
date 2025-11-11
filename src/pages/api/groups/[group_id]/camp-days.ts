import type { APIRoute } from "astro";
import { createCampDay, listCampDays } from "../../../../lib/services/camp-days.service";
import { errors } from "../../../../lib/errors";
import type { ApiResponse, ApiListResponse } from "../../../../types";

export const prerender = false;

function statusFromResponse<T>(resp: ApiResponse<T> | ApiListResponse<T>): number {
  if ("error" in resp) {
    switch (resp.error.code) {
      case "VALIDATION_ERROR":
      case "DAY_OUT_OF_RANGE":
      case "DATE_OUT_OF_GROUP_RANGE":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      case "FORBIDDEN_ROLE":
        return 403;
      case "NOT_FOUND":
        return 404;
      case "DUPLICATE_DAY_NUMBER":
      case "CONFLICT":
        return 409;
      default:
        return 500;
    }
  }
  // Success list vs single
  return 200;
}

export const GET: APIRoute = async ({ params, locals }) => {
  const { supabase } = locals as { supabase: any };
  const userId = locals.user?.id;
  const groupId = params.group_id;
  if (!groupId || typeof groupId !== "string") {
    const resp = errors.validation({ group_id: "required" });
    return new Response(JSON.stringify(resp), { status: 400 });
  }
  const result = await listCampDays(supabase, userId, groupId);
  return new Response(JSON.stringify(result), { status: statusFromResponse(result) });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase } = locals as { supabase: any };
  const userId = locals.user?.id;
  const groupId = params.group_id;
  if (!groupId || typeof groupId !== "string") {
    const resp = errors.validation({ group_id: "required" });
    return new Response(JSON.stringify(resp), { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(errors.badRequest("Invalid JSON body")), { status: 400 });
  }
  const result = await createCampDay(supabase, userId, groupId, body);
  const status = "error" in result ? statusFromResponse(result) : 201; // 201 on successful create
  return new Response(JSON.stringify(result), { status });
};
