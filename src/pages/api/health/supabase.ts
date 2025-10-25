import type { APIRoute } from "astro";
import { supabasePing } from "../../../db/supabase.client";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { data, error } = await supabasePing();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message, details: error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, sample: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
