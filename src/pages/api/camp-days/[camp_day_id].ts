import type { APIRoute } from "astro";
import { getCampDay, updateCampDay, deleteCampDay } from "../../../lib/services/camp-days.service";
import { errors } from "../../../lib/errors";

export const prerender = false;

function statusFromResponse(resp: any): number {
  if (resp && resp.error) {
    switch (resp.error.code) {
      case "VALIDATION_ERROR":
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
  return 200;
}

function extractCampDayId(params: Record<string, string | undefined>) {
  const id = params.camp_day_id;
  if (!id || typeof id !== "string") {
    return { error: errors.validation({ camp_day_id: "required" }) };
  }
  return { id };
}

export const GET: APIRoute = async ({ params, locals }) => {
  const parsed = extractCampDayId(params);
  if ("error" in parsed) {
    return new Response(JSON.stringify(parsed), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { supabase } = locals as { supabase: any };
  const result = await getCampDay(supabase, (locals as any).userId, parsed.id);
  return new Response(JSON.stringify(result), {
    status: statusFromResponse(result),
    headers: { "Content-Type": "application/json" },
  });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const parsed = extractCampDayId(params);
  if ("error" in parsed) {
    return new Response(JSON.stringify(parsed), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(errors.badRequest("Invalid JSON body")), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { supabase } = locals as { supabase: any };
  const result = await updateCampDay(supabase, (locals as any).userId, parsed.id, body);
  return new Response(JSON.stringify(result), {
    status: statusFromResponse(result),
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const parsed = extractCampDayId(params);
  if ("error" in parsed) {
    return new Response(JSON.stringify(parsed), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { supabase } = locals as { supabase: any };
  const result = await deleteCampDay(supabase, (locals as any).userId, parsed.id);
  return new Response(JSON.stringify(result), {
    status: statusFromResponse(result),
    headers: { "Content-Type": "application/json" },
  });
};
