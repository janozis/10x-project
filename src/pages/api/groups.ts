import type { APIRoute } from "astro";
import { errors } from "../../lib/errors";
import { createGroup, listGroups } from "../../lib/services/groups.service";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

export const prerender = false;

/**
 * POST /api/groups
 * Tymczasowy tryb anonimowy: jeśli middleware nie ustawi usera, używamy DEFAULT_USER_ID.
 * UWAGA: Wszystkie rekordy będą miały tego samego autora – do czasu wdrożenia prawdziwego auth.
 * Rekomendowane polityki RLS (Supabase SQL) dla publicznych operacji (opcjonalnie w dev):
 *
 *   ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "public select groups" ON groups FOR SELECT USING (true);
 *   CREATE POLICY "public insert groups" ON groups FOR INSERT WITH CHECK (true);
 *
 * Jeśli chcesz aby created_by było zawsze DEFAULT_USER_ID nawet przy podanym innym, możesz dodać trigger.
 */
export const POST: APIRoute = async (context) => {
  const debugEnabled = import.meta.env.ENABLE_DEBUG_LOGS === "true";
  
  let userId = context.locals.user?.id;
  if (!userId) {
    // Fallback anonimowy – TODO: usunąć po wdrożeniu realnego auth
    userId = DEFAULT_USER_ID;
  }

  if (debugEnabled) {
    console.log("[POST /api/groups] Request received");
    console.log("[POST /api/groups] User ID:", userId);
  }

  let jsonBody: unknown;
  try {
    jsonBody = await context.request.json();
    if (debugEnabled) {
      console.log("[POST /api/groups] Request body:", jsonBody);
    }
  } catch {
    const body = JSON.stringify(errors.validation({ body: "Invalid or missing JSON" }));
    return new Response(body, { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const supabase = context.locals.supabase;
  if (!supabase) {
    const body = JSON.stringify(errors.internal("Supabase client not available"));
    return new Response(body, { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const result = await createGroup(supabase, userId, jsonBody);

  if ("error" in result) {
    if (debugEnabled) {
      console.error("[POST /api/groups] Error from createGroup:", result.error);
    }
    const code = result.error.code;
    const status = mapErrorCodeToHttpStatus(code);
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (debugEnabled) {
    console.log("[POST /api/groups] Group created successfully:", result.data?.id);
  }

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * GET /api/groups
 * Returns only groups where the authenticated user is a member.
 * Uses group_memberships table for filtering.
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const debugEnabled = import.meta.env.ENABLE_DEBUG_LOGS === "true";
  
  if (debugEnabled) {
    console.log("[GET /api/groups] Request received");
    console.log("[GET /api/groups] User:", context.locals.user);
  }
  
  if (!supabase) {
    return new Response(JSON.stringify(errors.internal("Supabase client not available")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  if (!context.locals.user) {
    if (debugEnabled) {
      console.log("[GET /api/groups] No user in context.locals");
    }
    return new Response(JSON.stringify(errors.unauthorized("Authentication required")), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const url = new URL(context.request.url);
  const deletedParam = url.searchParams.get("deleted");
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const deleted = deletedParam === "1" || deletedParam === "true";
  const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : undefined;
  
  if (debugEnabled) {
    console.log("[GET /api/groups] Calling listGroups with:", { deleted, limit, cursor: cursorParam });
  }
  
  // RLS automatically filters by auth.uid(), so we don't need to pass userId
  const result = await listGroups(supabase, { 
    deleted, 
    limit, 
    cursor: cursorParam ?? undefined
  });
  
  if ("error" in result) {
    if (debugEnabled) {
      console.error("[GET /api/groups] Error from listGroups:", result.error);
    }
    const status = mapErrorCodeToHttpStatus(result.error.code);
    return new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });
  }
  
  if (debugEnabled) {
    console.log("[GET /api/groups] Success, returning", result.data?.length, "groups");
  }
  
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
};

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
