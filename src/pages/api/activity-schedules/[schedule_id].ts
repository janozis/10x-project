import type { APIRoute } from "astro";
import { updateActivitySchedule, deleteActivitySchedule } from "../../../lib/services/activity-schedules.service";
import { errors } from "../../../lib/errors";

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
      return 404;
    case "CONFLICT":
      return 409;
    case "INTERNAL_ERROR":
      return 500;
    default:
      return 400;
  }
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const scheduleId = params.schedule_id as string;
  if (!scheduleId || scheduleId.length < 10) {
    const err = errors.validation({ schedule_id: "Invalid schedule_id" });
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
  const result = await updateActivitySchedule(supabase, userId, scheduleId, body);
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: mapStatus(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const scheduleId = params.schedule_id as string;
  if (!scheduleId || scheduleId.length < 10) {
    const err = errors.validation({ schedule_id: "Invalid schedule_id" });
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const supabase = locals.supabase;
  const userId = locals.user?.id as string | undefined;
  const result = await deleteActivitySchedule(supabase, userId, scheduleId);
  if ("error" in result) {
    return new Response(JSON.stringify(result), {
      status: mapStatus(result.error.code),
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};
