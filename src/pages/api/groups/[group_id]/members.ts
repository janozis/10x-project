export const prerender = false;
import type { APIRoute } from "astro";
import { listMembers } from "../../../../lib/services/group-memberships.service";
import { errors } from "../../../../lib/errors";
import { statusForErrorCode } from "../../../../lib/http/status";

export const GET: APIRoute = async (context) => {
  const { group_id } = context.params;
  const supabase = context.locals.supabase;
  const user = context.locals.user; // { id }
  if (!supabase) {
    const err = errors.internal("Supabase client not available");
    return new Response(JSON.stringify(err), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = await listMembers(supabase, user?.id, group_id || "");
  if ("error" in result) {
    return new Response(JSON.stringify(result), { 
      status: statusForErrorCode(result.error.code),
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(result), { 
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
