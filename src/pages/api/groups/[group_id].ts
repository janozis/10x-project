import type { APIRoute } from "astro";
import { errors } from "@/lib/errors";
import { softDeleteGroup, updateGroup } from "@/lib/services/groups.service";
import { mapGroupRowToDTO } from "@/lib/mappers/group.mapper";
import { DEFAULT_USER_ID } from "@/db/supabase.client";

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

/**
 * GET /api/groups/[group_id]
 * Returns group details. User must be a member of the group.
 */
export const GET: APIRoute = async (context) => {
  const groupId = context.params.group_id;
  const userId = context.locals.user?.id || DEFAULT_USER_ID;

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

  // First, verify user is a member of this group
  const { data: membership, error: membershipError } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    return new Response(JSON.stringify(errors.internal("Failed to verify membership")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If user is not a member, return 404 (don't reveal group existence)
  if (!membership) {
    return new Response(JSON.stringify(errors.notFound("Group")), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // User is a member, now fetch the group
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

  const dto = mapGroupRowToDTO(row);
  return new Response(JSON.stringify({ data: dto }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
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
