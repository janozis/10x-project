import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type { ApiResponse, ApiListResponse, UUID, AIEvaluationDTO } from "../../types";
import { errors } from "../errors";
import { mapAIEvaluationRow } from "../mappers/ai-evaluation.mapper";

function unauthorized<T>(): ApiResponse<T> {
  return errors.unauthorized();
}
function forbidden<T>(): ApiResponse<T> {
  return errors.forbiddenRole();
}
function notFound<T>(entity = "Activity"): ApiResponse<T> {
  return errors.notFound(entity);
}
function internal<T>(message?: string): ApiResponse<T> {
  return errors.internal(message);
}

// Membership + role fetch (same pattern as activities.service)
async function fetchUserGroupPermissions(
  supabase: SupabaseClient,
  groupId: UUID,
  userId: UUID
): Promise<{ role: string | null; can_edit_all: boolean | null; can_edit_assigned_only: boolean | null }> {
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("role, can_edit_all, can_edit_assigned_only")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { role: null, can_edit_all: null, can_edit_assigned_only: null };
  return data ?? { role: null, can_edit_all: null, can_edit_assigned_only: null };
}

function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

/**
 * Queue a new AI evaluation for an activity.
 * Authorization: user must be a member of the activity's group AND (admin OR assigned editor).
 * Cooldown: enforced server-side by RPC (minimum 5 minutes between requests).
 * Side effects: updates activities.last_evaluation_requested_at and inserts a row into ai_evaluation_requests.
 * Returns a polling hint (next_poll_after_sec) without exposing request id in MVP.
 */
export async function requestAIEvaluation(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  activityId: UUID
): Promise<ApiResponse<{ queued: true; next_poll_after_sec: number }>> {
  const authUserId = effectiveUserId(userId);
  // Fetch minimal activity row for group context & deletion check
  const { data: actRow, error: actErr } = await supabase
    .from("activities")
    .select("id, group_id, deleted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (actErr) return internal(actErr.message);
  if (!actRow || actRow.deleted_at) return errors.activityNotFound();

  // Role check: admin OR assigned editor of this activity
  const perms = await fetchUserGroupPermissions(supabase, actRow.group_id, authUserId);
  if (!perms.role) return unauthorized();
  if (perms.role !== "admin") {
    const { data: editorRows, error: edErr } = await supabase
      .from("activity_editors")
      .select("user_id")
      .eq("activity_id", activityId)
      .eq("user_id", authUserId);
    if (edErr) return internal(edErr.message);
    if (!editorRows || editorRows.length === 0) return forbidden();
  }

  // Invoke RPC function; capture specific errors for cooldown
  // Supabase generated types may not yet include the RPC; cast name as any to suppress type mismatch until regen.
  // Use unknown generic until Supabase types regenerated to include RPC definition.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not yet in generated types
  const { data: reqId, error: rpcErr } = await (supabase as any).rpc("request_ai_evaluation", {
    p_activity: activityId,
    p_user: authUserId,
  });
  if (rpcErr) {
    const msg = rpcErr.message || "RPC error";
    if (/cooldown/i.test(msg)) return errors.aiEvaluationCooldown();
    if (/activity_not_found/i.test(msg)) return errors.activityNotFound();
    return internal(msg);
  }
  if (!reqId) return internal("Missing request id");
  // For MVP we don't expose request id, only polling hint
  return { data: { queued: true, next_poll_after_sec: 5 } };
}

/**
 * List all AI evaluation versions for the given activity (newest first).
 * Any group member can read. Soft-deleted activities return ACTIVITY_NOT_FOUND.
 */
export async function listAIEvaluations(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  activityId: UUID
): Promise<ApiListResponse<AIEvaluationDTO>> {
  const authUserId = effectiveUserId(userId);
  // Fetch activity for group context & membership check
  const { data: actRow, error: actErr } = await supabase
    .from("activities")
    .select("id, group_id, deleted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (actErr) return internal(actErr.message);
  if (!actRow || actRow.deleted_at) return errors.activityNotFound();
  const perms = await fetchUserGroupPermissions(supabase, actRow.group_id, authUserId);
  if (!perms.role) return unauthorized();

  const { data: evalRows, error: evalErr } = await supabase
    .from("ai_evaluations")
    .select("*")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (evalErr) return internal(evalErr.message);
  if (!evalRows) return { data: [] };
  return { data: evalRows.map(mapAIEvaluationRow) };
}

/**
 * Fetch a single AI evaluation by its UUID.
 * Validates user membership in the related activity's group. Returns NOT_FOUND if evaluation or activity is missing.
 */
export async function getAIEvaluation(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  evaluationId: UUID
): Promise<ApiResponse<AIEvaluationDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("ai_evaluations").select("*").eq("id", evaluationId).maybeSingle();
  if (error) return internal(error.message);
  if (!row) return notFound("AI Evaluation");
  // Fetch related activity to confirm membership
  const { data: actRow, error: actErr } = await supabase
    .from("activities")
    .select("group_id")
    .eq("id", row.activity_id)
    .maybeSingle();
  if (actErr) return internal(actErr.message);
  if (!actRow) return notFound("Activity");
  const perms = await fetchUserGroupPermissions(supabase, actRow.group_id, authUserId);
  if (!perms.role) return unauthorized();
  return { data: mapAIEvaluationRow(row) };
}
