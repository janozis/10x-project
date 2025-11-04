export const prerender = false;
import type { APIRoute } from "astro";
import { promoteMemberAdmin } from "../../../../../../lib/services/group-memberships.service";
import { errors } from "../../../../../../lib/errors";
import { statusForErrorCode } from "../../../../../../lib/http/status";

export const POST: APIRoute = async (context) => {
  const { group_id, user_id } = context.params;
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  if (!supabase) {
    return new Response(JSON.stringify(errors.internal()), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = await promoteMemberAdmin(supabase, user?.id, group_id || "", user_id || "");
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
