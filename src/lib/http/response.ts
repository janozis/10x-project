/**
 * Helper functions for creating API responses with proper headers
 */

/**
 * Creates a JSON Response with proper Content-Type header
 */
export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
