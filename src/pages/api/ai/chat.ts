import type { APIRoute } from "astro";
import { OpenRouterService } from "../../../lib/services/openrouter";
import { chatRequestSchema } from "../../../lib/validation/llm";
import { errors } from "../../../lib/errors";
import type { LlmApiError, LlmCompletionResult } from "../../../types";

export const prerender = false;

/**
 * POST /api/ai/chat
 *
 * Executes a synchronous chat completion request to OpenRouter API.
 * This endpoint acts as a secure proxy, keeping the API key server-side.
 *
 * Request body:
 * {
 *   "messages": [
 *     { "role": "system", "content": "You are a helpful assistant." },
 *     { "role": "user", "content": "Hello!" }
 *   ],
 *   "options": {
 *     "model": "anthropic/claude-3.5-sonnet",
 *     "params": { "temperature": 0.7, "max_tokens": 1000 },
 *     "response_format": {
 *       "type": "json_schema",
 *       "json_schema": {
 *         "name": "MySchema",
 *         "strict": true,
 *         "schema": { ... }
 *       }
 *     }
 *   }
 * }
 *
 * Success response (200):
 * {
 *   "ok": true,
 *   "data": {
 *     "id": "gen-...",
 *     "model": "anthropic/claude-3.5-sonnet",
 *     "created": 1234567890,
 *     "content": "...",
 *     "usage": { "prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30 }
 *   }
 * }
 *
 * Error response:
 * {
 *   "ok": false,
 *   "error": { "code": "LLM_...", "message": "..." }
 * }
 */
export const POST: APIRoute = async (context) => {
  // Guard: Parse and validate request body
  let jsonBody: unknown;
  try {
    jsonBody = await context.request.json();
  } catch {
    const body = JSON.stringify(errors.validation({ body: "Invalid or missing JSON" }));
    return new Response(body, {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate request schema
  const parseResult = chatRequestSchema.safeParse(jsonBody);
  if (!parseResult.success) {
    const body = JSON.stringify(
      errors.validation({
        messages: parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      })
    );
    return new Response(body, {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, options } = parseResult.data;

  // Initialize OpenRouter service
  let service: OpenRouterService;
  try {
    service = new OpenRouterService({
      defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL || "openrouter/auto",
      headers: {
        referer: import.meta.env.OPENROUTER_REFERER,
        title: import.meta.env.OPENROUTER_TITLE,
      },
    });
  } catch {
    // Configuration error (missing API key)
    const body = JSON.stringify({
      ok: false,
      error: {
        code: "LLM_CONFIG_ERROR",
        message: "OpenRouter service is not configured properly",
      },
    });
    return new Response(body, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Execute completion request
  try {
    const result: LlmCompletionResult = await service.completeChat(messages, options);

    const body = JSON.stringify({
      ok: true,
      data: result,
    });

    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Map LLM errors to HTTP responses
    return handleLlmError(error);
  }
};

/**
 * Maps LlmApiError to appropriate HTTP response
 */
function handleLlmError(error: unknown): Response {
  // Check if it's an LlmApiError
  if (isLlmApiError(error)) {
    const body = JSON.stringify({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return new Response(body, {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Unknown error - return generic internal error
  const body = JSON.stringify({
    ok: false,
    error: {
      code: "LLM_UPSTREAM_ERROR",
      message: "An unexpected error occurred",
    },
  });

  return new Response(body, {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Type guard for LlmApiError
 */
function isLlmApiError(error: unknown): error is Error & LlmApiError {
  return error !== null && typeof error === "object" && "code" in error && "statusCode" in error && "message" in error;
}
