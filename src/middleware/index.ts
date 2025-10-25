import { defineMiddleware } from "astro:middleware";
import { supabaseClient, DEFAULT_USER_ID } from "../db/supabase.client";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  // Temporary auth stub: attach a fixed user id for development/testing until real auth/session is implemented.
  context.locals.user = { id: DEFAULT_USER_ID };
  return next();
});
