import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  // Home page
  "/",
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  // Join page (must be public for invite links)
  "/join",
  // API endpoints would go here if needed
  "/api/auth/logout", // Allow logout for everyone
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase server instance with cookie management
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Store supabase instance in locals for use in API routes and pages
  locals.supabase = supabase;

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some((path) => {
    // Exact match
    if (url.pathname === path) return true;
    // For paths that are directories, check if current path starts with it
    // but only if it's not the root path
    if (path !== "/" && url.pathname.startsWith(path)) return true;
    return false;
  });

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is authenticated - store user info in locals
    locals.user = {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name,
    };
  } else if (!isPublicPath) {
    // Check if this is an API request
    const isApiRequest = url.pathname.startsWith("/api/");
    
    if (isApiRequest) {
      // For API requests, don't redirect - let the endpoint handle auth
      // The endpoint will return proper JSON error response
      // Just continue without setting locals.user
    } else {
      // User is not authenticated and trying to access protected page
      // Redirect to login with return URL
      const redirectTo = url.pathname + url.search;
      return redirect(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }

  return next();
});
