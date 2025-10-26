import type { APIRoute } from "astro";
import { createActivitySchedule, listActivitySchedules } from "../../../../lib/services/activity-schedules.service";
import { errors } from "../../../../lib/errors";

export const prerender = false;

function mapStatus(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "ORDER_IN_DAY_CONFLICT":
    case "OVERLAPPING_TIME":
    case "BAD_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN_ROLE":
      return 403;
    case "NOT_FOUND":
    case "ACTIVITY_NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "INTERNAL_ERROR":
      return 500;
    default:
      return 400;
  }
}

export const GET: APIRoute = async ({ params, locals }) => {
  const campDayId = params.camp_day_id as string;
  if (!campDayId || campDayId.length < 10) {
    const err = errors.validation({ camp_day_id: "Invalid camp_day_id" });
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const supabase = locals.supabase;
  const userId = locals.user?.id as string | undefined;
  const result = await listActivitySchedules(supabase, userId, campDayId);
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: mapStatus(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const campDayId = params.camp_day_id as string;
  if (!campDayId || campDayId.length < 10) {
    const err = errors.validation({ camp_day_id: "Invalid camp_day_id" });
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const supabase = locals.supabase;
  const userId = locals.user?.id as string | undefined;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(errors.badRequest("Invalid JSON body")), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const result = await createActivitySchedule(supabase, userId, campDayId, body);
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: mapStatus(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result), { status: 201, headers: { "Content-Type": "application/json" } });
};
