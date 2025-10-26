export const prerender = false;
import type { APIRoute } from "astro";
import { changeMemberRole, removeMember } from "../../../../../lib/services/group-memberships.service";
import { errors } from "../../../../../lib/errors";
import { statusForErrorCode } from "../../../../../lib/http/status";

export const ALL: APIRoute = async (context) => {
  const method = context.request.method.toUpperCase();
  if (!["PATCH", "DELETE"].includes(method)) {
    return new Response(JSON.stringify(errors.internal("Method not supported")), { status: 405 });
  }
  const { group_id, user_id } = context.params;
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  if (!supabase) return new Response(JSON.stringify(errors.internal()), { status: 500 });

  if (method === "PATCH") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      body = undefined;
    }
    const result = await changeMemberRole(supabase, user?.id, group_id || "", user_id || "", body);
    if ("error" in result)
      return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
    return new Response(JSON.stringify(result), { status: 200 });
  }

  if (method === "DELETE") {
    const result = await removeMember(supabase, user?.id, group_id || "", user_id || "");
    if ("error" in result)
      return new Response(JSON.stringify(result), { status: statusForErrorCode(result.error.code) });
    return new Response(JSON.stringify(result), { status: 200 });
  }

  return new Response(JSON.stringify(errors.internal("Unhandled method")), { status: 500 });
};
