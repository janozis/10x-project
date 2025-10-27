import type { APIRoute } from "astro";
import { errors } from "../../../../lib/errors";
import { statusForErrorCode } from "../../../../lib/http/status";
import { groupTaskCreateSchema } from "../../../../lib/validation/groupTask";
import { createGroupTask, listGroupTasks } from "../../../../lib/services/group-tasks.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import { z } from "zod";
import { zodErrorToDetails } from "../../../../lib/validation/activity"; // Reuse helper

export const prerender = false;

// Schema for query params parsing (list filters)
const listQuerySchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "canceled"]).optional(),
  activity_id: z.string().uuid().optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  cursor: z.string().optional(),
});

// GET /api/groups/[group_id]/tasks
export const GET: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const groupId = ctx.params.group_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });
  if (!/^[0-9a-fA-F-]{36}$/.test(groupId)) {
    const err = errors.validation({ group_id: "invalid uuid" });
    return new Response(JSON.stringify(err), { status: 400 });
  }
  const qp = Object.fromEntries(new URL(ctx.request.url).searchParams.entries());
  const parsed = listQuerySchema.safeParse(qp);
  if (!parsed.success) {
    const err = errors.validation(zodErrorToDetails(parsed.error));
    return new Response(JSON.stringify(err), { status: 400 });
  }
  const result = await listGroupTasks(supabase, userId, groupId, parsed.data);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
  return new Response(JSON.stringify(result), { status: 200 });
};

// POST /api/groups/[group_id]/tasks
export const POST: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase;
  const userId = ctx.locals.user?.id || DEFAULT_USER_ID;
  const groupId = ctx.params.group_id || "";
  if (!supabase) return new Response(JSON.stringify(errors.internal("Supabase client not available")), { status: 500 });
  if (!/^[0-9a-fA-F-]{36}$/.test(groupId)) {
    const err = errors.validation({ group_id: "invalid uuid" });
    return new Response(JSON.stringify(err), { status: 400 });
  }
  let jsonBody: unknown;
  try {
    jsonBody = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify(errors.validation({ body: "Invalid or missing JSON" })), { status: 400 });
  }
  const parsed = groupTaskCreateSchema.safeParse(jsonBody);
  if (!parsed.success) {
    const err = errors.validation(zodErrorToDetails(parsed.error));
    return new Response(JSON.stringify(err), { status: 400 });
  }
  const result = await createGroupTask(supabase, userId, groupId, parsed.data);
  if ("error" in result) return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
  return new Response(JSON.stringify(result), { status: 201 });
};
