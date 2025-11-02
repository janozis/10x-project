import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/ai/debug-env
 *
 * Debug endpoint to check if environment variables are loaded
 * ⚠️ REMOVE IN PRODUCTION - exposes API key status
 */
export const GET: APIRoute = async () => {
  const hasApiKey = !!import.meta.env.OPENROUTER_API_KEY;
  const apiKeyLength = import.meta.env.OPENROUTER_API_KEY?.length || 0;
  const apiKeyPrefix = import.meta.env.OPENROUTER_API_KEY?.substring(0, 15) || "NOT_SET";
  const referer = import.meta.env.OPENROUTER_REFERER || "NOT_SET";
  const title = import.meta.env.OPENROUTER_TITLE || "NOT_SET";

  return new Response(
    JSON.stringify(
      {
        hasApiKey,
        apiKeyLength,
        apiKeyPrefix: apiKeyLength > 0 ? `${apiKeyPrefix}...` : "NOT_SET",
        referer,
        title,
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
