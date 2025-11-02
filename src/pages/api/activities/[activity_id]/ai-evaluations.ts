import type { APIRoute } from "astro";
import { errors } from "../../../../lib/errors";
import { requestAIEvaluation, listAIEvaluations } from "../../../../lib/services/ai-evaluations.service";
import { validateUuid, validateEmptyBody } from "../../../../lib/validation/aiEvaluation";
import { jsonResponse } from "../../../../lib/http/response";

export const prerender = false;

function mapErrorToStatus(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "BAD_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN_ROLE":
      return 403;
    case "ACTIVITY_NOT_FOUND":
    case "NOT_FOUND":
      return 404;
    case "AI_EVALUATION_COOLDOWN":
      return 429;
    case "CONFLICT":
      return 409;
    default:
      return 500;
  }
}

export const GET: APIRoute = async ({ params, locals }) => {
  const activityId = params.activity_id || "";
  const uuidValid = validateUuid(activityId, "activity_id");
  if (!uuidValid.valid) {
    const err = errors.validation(uuidValid.error || { activity_id: "Invalid UUID" });
    return jsonResponse(err, { status: 400 });
  }
  const supabase = locals.supabase;
  const user = locals.user;
  const result = await listAIEvaluations(supabase, user?.id, activityId);
  if ("error" in result) {
    return jsonResponse(result, { status: mapErrorToStatus(result.error.code) });
  }
  return jsonResponse(result, { status: 200 });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const activityId = params.activity_id || "";
  const uuidValid = validateUuid(activityId, "activity_id");
  if (!uuidValid.valid) {
    const err = errors.validation(uuidValid.error || { activity_id: "Invalid UUID" });
    return jsonResponse(err, { status: 400 });
  }
  // Validate empty body semantics
  let body: unknown;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { __parseError: true };
  }
  const bodyValid = validateEmptyBody(body);
  if (!bodyValid.valid) {
    const err = errors.validation(bodyValid.error || { body: "Invalid body" });
    return jsonResponse(err, { status: 400 });
  }
  const supabase = locals.supabase;
  const user = locals.user;
  const result = await requestAIEvaluation(supabase, user?.id, activityId);
  if ("error" in result) {
    return jsonResponse(result, { status: mapErrorToStatus(result.error.code) });
  }
  return jsonResponse(result, { status: 202 });
};
