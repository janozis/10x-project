/**
 * AI Evaluation Worker
 *
 * Background service that processes AI evaluation requests from the queue.
 * Scans ai_evaluation_requests table for pending requests, sends them to OpenRouter LLM,
 * validates and stores results in ai_evaluations table.
 *
 * Usage:
 * - Run as standalone: node --loader tsx src/workers/ai-evaluation-worker.ts
 * - Run with tsx: npx tsx src/workers/ai-evaluation-worker.ts
 * - Deploy as Supabase Edge Function (copy code to functions/ directory)
 */

/* eslint-disable no-console */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import { OpenRouterService } from "../lib/services/openrouter";
import type { UUID, AIEvaluationRequestStatus } from "../types";

/**
 * AI Evaluation Request entity (not in generated types, but exists in DB)
 * See migration: supabase/migrations/20251026103000_ai_evaluation_requests.sql
 */
interface AIEvaluationRequest {
  id: UUID;
  activity_id: UUID;
  requested_by: UUID;
  status: AIEvaluationRequestStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

/** Response schema expected from LLM */
interface AIEvaluationResponse {
  lore_score: number;
  lore_feedback: string;
  scouting_values_score: number;
  scouting_feedback: string;
  suggestions: string[];
}

/** JSON Schema for structured LLM response validation */
const AI_EVAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    lore_score: { type: "number", minimum: 1, maximum: 10 },
    lore_feedback: { type: "string", maxLength: 500 },
    scouting_values_score: { type: "number", minimum: 1, maximum: 10 },
    scouting_feedback: { type: "string", maxLength: 500 },
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: { type: "string", maxLength: 300 },
    },
  },
  required: ["lore_score", "lore_feedback", "scouting_values_score", "scouting_feedback", "suggestions"],
};

/** Worker configuration */
const WORKER_CONFIG = {
  pollIntervalMs: 10000, // 10 seconds between queue scans
  batchSize: 5, // Max requests to process in parallel
  model: "anthropic/claude-3.5-sonnet",
  temperature: 0.3, // Low temperature for consistent evaluations
  maxTokens: 2000,
};

/**
 * Initialize Supabase client for worker
 * Uses process.env for Node.js runtime compatibility
 */
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
    console.log("[AI Eval Worker] ✅ Supabase client initialized");
  } catch (error) {
    console.error("[AI Eval Worker] ❌ Failed to create Supabase client:", error);
  }
} else {
  console.error("[AI Eval Worker] ❌ Missing environment variables:", {
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseKey,
  });
}

/**
 * Sanitizes text for safe inclusion in LLM prompts
 * Removes XSS vectors, HTML tags, and enforces length limits
 */
function sanitizeForPrompt(text: string | null | undefined): string {
  if (!text) return "";

  return (
    text
      // Remove script tags (XSS prevention)
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      // Remove all HTML tags
      .replace(/<[^>]+>/g, "")
      // Remove potential injection attempts
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
      // Enforce max length (5000 chars per field)
      .substring(0, 5000)
  );
}

/**
 * Builds the system prompt for the LLM
 */
function buildSystemPrompt(): string {
  return `Jesteś ekspertem w ocenie programów harcerskich oraz zgodności zajęć z wybraną tematyką lore.

Twoim zadaniem jest ocenić zajęcie harcerskie pod dwoma względami:
1. **Zgodność z lore** (1-10): Jak dobrze zajęcie pasuje do wybranej tematyki/klimatu obozu
2. **Wartości harcerskie** (1-10): Jak dobrze zajęcie realizuje cele wychowania harcerskiego

Dodatkowo, wygeneruj 3-5 pytań prowokujących instruktorów do przemyślenia i ewentualnego ulepszenia zajęcia.

## Skala ocen:
- 1-3: Wymaga znacznych poprawek
- 4-6: Dobra podstawa, sugerujemy zmiany
- 7-8: Bardzo dobre
- 9-10: Doskonałe

## Format odpowiedzi (JSON Schema):
{
  "lore_score": number (1-10),
  "lore_feedback": string (1-3 zdania uzasadnienia),
  "scouting_values_score": number (1-10),
  "scouting_feedback": string (1-3 zdania uzasadnienia),
  "suggestions": string[] (3-5 pytań prowokujących)
}`;
}

/**
 * Builds the user prompt with activity details
 */
function buildUserPrompt(activity: {
  lore_theme: string | null;
  title: string | null;
  objective: string | null;
  tasks: string | null;
  duration_minutes: number | null;
  location: string | null;
  materials: string | null;
  responsible: string | null;
  knowledge_scope: string | null;
  participants: string | null;
  flow: string | null;
  summary: string | null;
}): string {
  return `Oceń następujące zajęcie harcerskie:

## Kontekst obozu:
- Tematyka (lore): ${sanitizeForPrompt(activity.lore_theme) || "brak"}

## Szczegóły zajęcia:
- Tytuł: ${sanitizeForPrompt(activity.title) || "brak"}
- Cel: ${sanitizeForPrompt(activity.objective) || "brak"}
- Zadania dla uczestników: ${sanitizeForPrompt(activity.tasks) || "brak"}
- Czas trwania: ${activity.duration_minutes || 0} minut
- Miejsce: ${sanitizeForPrompt(activity.location) || "brak"}
- Materiały: ${sanitizeForPrompt(activity.materials) || "brak"}
- Osoby odpowiedzialne: ${sanitizeForPrompt(activity.responsible) || "brak"}
- Wymagana wiedza: ${sanitizeForPrompt(activity.knowledge_scope) || "brak"}
- Uczestnicy: ${sanitizeForPrompt(activity.participants) || "brak"}
- Przebieg:
${sanitizeForPrompt(activity.flow) || "brak"}
- Podsumowanie: ${sanitizeForPrompt(activity.summary) || "brak"}

## Kryteria oceny:
1. **Zgodność z lore**: Czy zajęcie wpisuje się w tematykę "${sanitizeForPrompt(activity.lore_theme) || "brak"}"? Czy klimat jest zachowany?
2. **Wartości harcerskie**: Czy zajęcie rozwija kompetencje harcerskie (praca w zespole, samodzielność, odpowiedzialność, umiejętności survivalowe, kreatywność)?

## Zadanie:
Oceń to zajęcie na skali 1-10 dla każdego kryterium i wygeneruj 3-5 pytań, które pomogą instruktorom zastanowić się jak ulepszyć zajęcie.`;
}

/**
 * Validates and clamps evaluation response values
 */
function validateEvaluation(evaluation: AIEvaluationResponse): AIEvaluationResponse {
  // Clamp scores to 1-10 range
  evaluation.lore_score = Math.max(1, Math.min(10, Math.round(evaluation.lore_score)));
  evaluation.scouting_values_score = Math.max(1, Math.min(10, Math.round(evaluation.scouting_values_score)));

  // Trim feedback to max length
  if (evaluation.lore_feedback.length > 500) {
    evaluation.lore_feedback = evaluation.lore_feedback.substring(0, 497) + "...";
  }
  if (evaluation.scouting_feedback.length > 500) {
    evaluation.scouting_feedback = evaluation.scouting_feedback.substring(0, 497) + "...";
  }

  // Limit suggestions array
  if (evaluation.suggestions.length > 10) {
    evaluation.suggestions = evaluation.suggestions.slice(0, 10);
  }

  // Trim individual suggestions
  evaluation.suggestions = evaluation.suggestions.map((s) => (s.length > 300 ? s.substring(0, 297) + "..." : s));

  return evaluation;
}

/**
 * Processes a single AI evaluation request
 */
async function processAIEvaluationRequest(requestId: UUID): Promise<void> {
  const startTime = Date.now();

  if (!supabaseClient) {
    console.error(`[AI Eval Worker] Supabase client not available`);
    return;
  }

  console.log(`[AI Eval Worker] Processing request ${requestId}`, {
    startedAt: new Date().toISOString(),
  });

  try {
    // 1. Fetch request from queue
    // Using 'any' cast because ai_evaluation_requests is not in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: request, error: requestError } = await (supabaseClient as any)
      .from("ai_evaluation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error(`[AI Eval Worker] ❌ Failed to fetch request ${requestId}:`, requestError);
      return;
    }

    const typedRequest = request as AIEvaluationRequest;
    console.log(`[AI Eval Worker] 📋 Request details:`, {
      id: typedRequest.id,
      activity_id: typedRequest.activity_id,
      requested_by: typedRequest.requested_by,
      status: typedRequest.status,
    });

    // 2. Update status to 'processing'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabaseClient as any)
      .from("ai_evaluation_requests")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error(`[AI Eval Worker] Failed to update request ${requestId} to processing:`, updateError);
      return;
    }

    // 3. Fetch activity data with lore_theme from group
    const { data: activity, error: activityError } = await supabaseClient
      .from("activities")
      .select(
        `
        id,
        title,
        objective,
        tasks,
        duration_minutes,
        location,
        materials,
        responsible,
        knowledge_scope,
        participants,
        flow,
        summary,
        groups!inner(lore_theme)
      `
      )
      .eq("id", typedRequest.activity_id)
      .single();

    if (activityError || !activity) {
      console.error(`[AI Eval Worker] ❌ Failed to fetch activity ${typedRequest.activity_id}`);
      console.error(`[AI Eval Worker] Activity error:`, {
        code: activityError?.code,
        message: activityError?.message,
        details: activityError?.details,
      });
      await markRequestAsFailed(requestId, "ACTIVITY_NOT_FOUND", "Activity not found or deleted");
      return;
    }

    console.log(`[AI Eval Worker] 📚 Activity fetched:`, {
      id: activity.id,
      title: activity.title,
      hasGroups: !!activity.groups,
      groupsType: typeof activity.groups,
    });

    // Guard: Verify groups data exists (TypeScript narrowing)
    if (!activity.groups || typeof activity.groups !== "object" || !("lore_theme" in activity.groups)) {
      console.error(`[AI Eval Worker] Missing groups data for activity ${typedRequest.activity_id}`);
      await markRequestAsFailed(requestId, "INTERNAL_ERROR", "Missing group data");
      return;
    }

    // 4. Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      lore_theme: activity.groups.lore_theme,
      title: activity.title,
      objective: activity.objective,
      tasks: activity.tasks,
      duration_minutes: activity.duration_minutes,
      location: activity.location,
      materials: activity.materials,
      responsible: activity.responsible,
      knowledge_scope: activity.knowledge_scope,
      participants: activity.participants,
      flow: activity.flow,
      summary: activity.summary,
    });

    // 5. Initialize OpenRouter service
    const llm = new OpenRouterService({
      defaultModel: WORKER_CONFIG.model,
      defaultParams: {
        temperature: WORKER_CONFIG.temperature,
        max_tokens: WORKER_CONFIG.maxTokens,
      },
    });

    console.log(`[AI Eval Worker] 🤖 Calling LLM:`, {
      model: WORKER_CONFIG.model,
      temperature: WORKER_CONFIG.temperature,
      maxTokens: WORKER_CONFIG.maxTokens,
    });

    // 6. Call LLM
    const result = await llm.completeChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "AIEvaluation",
            strict: true,
            schema: AI_EVAL_SCHEMA,
          },
        },
      }
    );

    console.log(`[AI Eval Worker] ✅ LLM response received:`, {
      id: result.id,
      model: result.model,
      tokens: result.usage?.total_tokens,
      contentLength: result.content.length,
    });

    // 7. Parse and validate response
    const rawEvaluation: AIEvaluationResponse = JSON.parse(result.content);
    const evaluation = validateEvaluation(rawEvaluation);

    console.log(`[AI Eval Worker] ✅ LLM response parsed and validated:`, {
      loreScore: evaluation.lore_score,
      scoutingScore: evaluation.scouting_values_score,
      suggestionsCount: evaluation.suggestions.length,
      tokens: result.usage?.total_tokens,
    });

    // 8. Insert evaluation into database using dedicated RPC function
    // This bypasses the trigger cooldown check (already validated by request_ai_evaluation RPC)

    const rpcParams = {
      p_activity_id: typedRequest.activity_id,
      p_lore_score: evaluation.lore_score,
      p_lore_feedback: evaluation.lore_feedback,
      p_scouting_values_score: evaluation.scouting_values_score,
      p_scouting_feedback: evaluation.scouting_feedback,
      p_suggestions: evaluation.suggestions, // jsonb
      p_tokens: result.usage?.total_tokens || null,
    };

    console.log(`[AI Eval Worker] 📝 Calling RPC: insert_ai_evaluation_from_worker`);
    console.log(`[AI Eval Worker] 📦 RPC Parameters (full):`, JSON.stringify(rpcParams, null, 2));
    console.log(`[AI Eval Worker] 📊 Parameter types:`, {
      p_activity_id: typeof rpcParams.p_activity_id,
      p_lore_score: typeof rpcParams.p_lore_score,
      p_lore_feedback: typeof rpcParams.p_lore_feedback,
      p_scouting_values_score: typeof rpcParams.p_scouting_values_score,
      p_scouting_feedback: typeof rpcParams.p_scouting_feedback,
      p_suggestions: `${typeof rpcParams.p_suggestions} (Array.isArray: ${Array.isArray(rpcParams.p_suggestions)})`,
      p_tokens: typeof rpcParams.p_tokens,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcResponse = await (supabaseClient as any).rpc("insert_ai_evaluation_from_worker", rpcParams);

    console.log(`[AI Eval Worker] 📥 Raw RPC Response:`, JSON.stringify(rpcResponse, null, 2));
    console.log(`[AI Eval Worker] 📥 Response breakdown:`, {
      hasData: !!rpcResponse.data,
      dataType: typeof rpcResponse.data,
      dataValue: rpcResponse.data,
      hasError: !!rpcResponse.error,
      errorType: rpcResponse.error ? typeof rpcResponse.error : "null",
    });

    const { data: evaluationId, error: insertError } = rpcResponse;

    if (insertError) {
      console.error(`[AI Eval Worker] ❌ Failed to insert evaluation for request ${requestId}`);
      console.error(`[AI Eval Worker] RPC Error (full object):`, JSON.stringify(insertError, null, 2));
      console.error(`[AI Eval Worker] RPC Error details:`, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        name: insertError.name,
        statusCode: insertError.statusCode,
      });
      await markRequestAsFailed(requestId, "INTERNAL_ERROR", insertError.message);
      return;
    }

    console.log(`[AI Eval Worker] ✅ Evaluation inserted successfully!`);
    console.log(`[AI Eval Worker] ✅ Returned evaluation ID:`, evaluationId);

    // 9. Mark request as completed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: completeError } = await (supabaseClient as any)
      .from("ai_evaluation_requests")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (completeError) {
      console.error(`[AI Eval Worker] Failed to mark request ${requestId} as completed:`, completeError);
      return;
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Eval Worker] ✅ Completed request ${requestId}`, {
      loreScore: evaluation.lore_score,
      scoutingScore: evaluation.scouting_values_score,
      tokens: result.usage?.total_tokens,
      durationMs: duration,
      model: result.model,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AI Eval Worker] ❌ Failed to process request ${requestId}:`, {
      error: String(error),
      durationMs: duration,
    });

    // Map error to code
    let errorCode = "INTERNAL_ERROR";
    if (error && typeof error === "object" && "code" in error) {
      const llmError = error as { code: string };
      if (llmError.code === "LLM_RATE_LIMIT") errorCode = "RATE_LIMIT_EXCEEDED";
      if (llmError.code === "LLM_AUTH_ERROR") errorCode = "INTERNAL_ERROR";
      if (llmError.code === "LLM_UPSTREAM_ERROR") errorCode = "INTERNAL_ERROR";
    }

    await markRequestAsFailed(requestId, errorCode, String(error));
  }
}

/**
 * Marks a request as failed with error details
 */
async function markRequestAsFailed(requestId: UUID, errorCode: string, errorMessage: string): Promise<void> {
  if (!supabaseClient) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseClient as any)
    .from("ai_evaluation_requests")
    .update({
      status: "failed",
      error_code: errorCode,
      error_message: errorMessage.substring(0, 500), // Limit error message length
      finished_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error(`[AI Eval Worker] Failed to mark request ${requestId} as failed:`, error);
  }
}

/**
 * Main worker loop - scans queue and processes pending requests
 */
async function runWorker(): Promise<void> {
  if (!supabaseClient) {
    console.error("[AI Eval Worker] Supabase client not available. Exiting.");
    return;
  }

  console.log("[AI Eval Worker] 🚀 Starting worker", {
    pollIntervalMs: WORKER_CONFIG.pollIntervalMs,
    batchSize: WORKER_CONFIG.batchSize,
    model: WORKER_CONFIG.model,
  });

  while (true) {
    try {
      // Fetch pending requests from queue
      // Using 'any' cast because ai_evaluation_requests is not in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: requests, error: fetchError } = await (supabaseClient as any)
        .from("ai_evaluation_requests")
        .select("id")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(WORKER_CONFIG.batchSize);

      if (fetchError) {
        console.error("[AI Eval Worker] Failed to fetch pending requests:", fetchError);
      } else if (requests && requests.length > 0) {
        console.log(`[AI Eval Worker] Found ${requests.length} pending request(s)`);

        // Process all requests in parallel
        await Promise.all(requests.map((req: { id: UUID }) => processAIEvaluationRequest(req.id)));
      }
    } catch (error) {
      console.error("[AI Eval Worker] Error in main loop:", error);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, WORKER_CONFIG.pollIntervalMs));
  }
}

// Export for testing and external invocation
export { processAIEvaluationRequest, runWorker, sanitizeForPrompt, validateEvaluation };

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((error) => {
    console.error("[AI Eval Worker] Fatal error:", error);
    process.exit(1);
  });
}
