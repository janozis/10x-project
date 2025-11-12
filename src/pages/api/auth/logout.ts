import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/logout
 * Logs out the current user by clearing the Supabase session
 */
export const POST: APIRoute = async ({ locals, cookies }) => {
  const { supabase } = locals;

  try {
    // Sign out from Supabase (this automatically clears session cookies via SSR)
    const { error } = await supabase.auth.signOut();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[logout] Supabase signOut error:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "LOGOUT_FAILED",
            message: "Nie udało się wylogować. Spróbuj ponownie.",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Supabase SSR automatically clears cookies during signOut
    // But we can also manually clear known cookie names as a fallback
    // Common Supabase cookie names follow pattern: sb-{project-ref}-auth-token
    try {
      // Try to clear common Supabase cookie names
      // These will fail silently if they don't exist
      cookies.delete("sb-access-token", { path: "/" });
      cookies.delete("sb-refresh-token", { path: "/" });

      // Also clear any cookies that might be set by the Supabase client
      // The actual cookie names depend on your Supabase project
      for (let i = 0; i < 10; i++) {
        cookies.delete(`sb-auth-token.${i}`, { path: "/" });
      }
    } catch (cookieError) {
      // Ignore cookie deletion errors - the main signOut should have cleared them
      // eslint-disable-next-line no-console
      console.debug("[logout] Cookie cleanup error (non-critical):", cookieError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[logout] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "LOGOUT_FAILED",
          message: "Wystąpił nieoczekiwany błąd podczas wylogowania.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
