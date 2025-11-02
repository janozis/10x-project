import type { APIRoute } from "astro";
import { errors } from "@/lib/errors";
import { softDeleteGroup, updateGroup } from "@/lib/services/groups.service";
import { mapGroupRowToDTO } from "@/lib/mappers/group.mapper";

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

export const GET: APIRoute = async (context) => {
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
  const { data: row, error } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  if (error) {
    return new Response(JSON.stringify(errors.internal("Failed to fetch group")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!row) {
    return new Response(JSON.stringify(errors.notFound("Group")), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const dto = mapGroupRowToDTO(row as any);
  return new Response(JSON.stringify({ data: dto }), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const DELETE: APIRoute = async (context) => {
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
  const result = await softDeleteGroup(supabase, userId, groupId);
  if ("error" in result) {
    const status = mapErrorCodeToHttpStatus(result.error.code);
    return new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const PATCH: APIRoute = async (context) => {
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
  let body: unknown = undefined;
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }
  const result = await updateGroup(supabase, context.locals.user?.id, groupId, body);
  if ("error" in result) {
    const status = mapErrorCodeToHttpStatus(result.error.code);
    return new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};


