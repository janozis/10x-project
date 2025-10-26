import type { APIRoute } from "astro";
import { errors } from "../../../lib/errors";
import { getAIEvaluation } from "../../../lib/services/ai-evaluations.service";
import { validateUuid } from "../../../lib/validation/aiEvaluation";

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
    default:
      return 500;
  }
}

export const GET: APIRoute = async ({ params, locals }) => {
  const evaluationId = params.evaluation_id || "";
  const uuidValid = validateUuid(evaluationId, "evaluation_id");
  if (!uuidValid.valid) {
    const err = errors.validation(uuidValid.error || { evaluation_id: "Invalid UUID" });
    return new Response(JSON.stringify(err), { status: 400 });
  }
  const supabase = locals.supabase;
  const user = locals.user;
  const result = await getAIEvaluation(supabase, user?.id, evaluationId);
  if ("error" in result) {
    return new Response(JSON.stringify(result), { status: mapErrorToStatus(result.error.code) });
  }
  return new Response(JSON.stringify(result), { status: 200 });
};
