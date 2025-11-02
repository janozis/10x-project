import type { APIRoute } from "astro";
import { errors } from "../../../lib/errors";
import { statusForErrorCode } from "../../../lib/http/status";
import { groupTaskUpdateSchema } from "../../../lib/validation/groupTask";
import { getGroupTask, updateGroupTask, deleteGroupTask } from "../../../lib/services/group-tasks.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { zodErrorToDetails } from "../../../lib/validation/activity"; // reuse helper

export const prerender = false;

// GET /api/tasks/[task_id]
export const GET: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const taskId = ctx.params.task_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500, headers: { "Content-Type": "application/json" } });
  if (!/^[0-9a-fA-F-]{36}$/.test(taskId)) {
    const err = errors.validation({ task_id: "invalid uuid" });
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const result = await getGroupTask(supabase, userId, taskId);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code), headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};

// PATCH /api/tasks/[task_id]
export const PATCH: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const taskId = ctx.params.task_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500, headers: { "Content-Type": "application/json" } });
  if (!/^[0-9a-fA-F-]{36}$/.test(taskId)) {
    const err = errors.validation({ task_id: "invalid uuid" });
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  let jsonBody: unknown;
  try {
    jsonBody = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify(errors.validation({ body: "Invalid or missing JSON" })), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const parsed = groupTaskUpdateSchema.safeParse(jsonBody);
  if (!parsed.success) {
    const err = errors.validation(zodErrorToDetails(parsed.error));
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const result = await updateGroupTask(supabase, userId, taskId, parsed.data);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code), headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};

// DELETE /api/tasks/[task_id]
export const DELETE: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const taskId = ctx.params.task_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500, headers: { "Content-Type": "application/json" } });
  if (!/^[0-9a-fA-F-]{36}$/.test(taskId)) {
    const err = errors.validation({ task_id: "invalid uuid" });
    return new Response(JSON.stringify(err), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const result = await deleteGroupTask(supabase, userId, taskId);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code), headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};
