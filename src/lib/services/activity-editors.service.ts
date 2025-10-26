import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type { ActivityEditorDTO, ApiListResponse, ApiResponse, UUID } from "../../types";
import { errors } from "../errors";
import { toActivityEditorDTO } from "../mappers/activity-editor.mapper";

// Shortcut local aliases to central error factories for readability
const userNotInGroup = errors.userNotInGroup;
const alreadyAssigned = errors.alreadyAssigned;
const activityNotFound = errors.activityNotFound;
const forbiddenRole = errors.forbiddenRole;
const conflict = errors.conflict;
const notFound = errors.notFound;
const internal = errors.internal;

interface ActivityRowMinimal {
  id: UUID;
  group_id: UUID;
  deleted_at: string | null;
}

interface MembershipRowMinimal {
  user_id: UUID;
  role: string;
}

/** Fetch minimal activity row to validate existence & soft delete status */
async function fetchActivity(supabase: SupabaseClient, activityId: UUID): Promise<ActivityRowMinimal | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, group_id, deleted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (error) return null;
  return data as ActivityRowMinimal | null;
}

/** Fetch membership (role) of user in a group */
async function fetchMembership(
  supabase: SupabaseClient,
  groupId: UUID,
  userId: UUID
): Promise<MembershipRowMinimal | null> {
  const { data, error } = await supabase
    .from("group_memberships")
    .select("user_id, role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data as MembershipRowMinimal | null;
}

/** List all editors for an activity (membership required) */
export async function listEditors(
  supabase: SupabaseClient,
  activityId: UUID,
  actorUserId: UUID | undefined
): Promise<ApiListResponse<ActivityEditorDTO>> {
  const effectiveUserId = actorUserId || (DEFAULT_USER_ID as UUID);
  const activity = await fetchActivity(supabase, activityId);
  if (!activity || activity.deleted_at) return activityNotFound();
  const membership = await fetchMembership(supabase, activity.group_id, effectiveUserId);
  if (!membership) return userNotInGroup({ activity_id: activityId });

  const { data: rows, error } = await supabase
    .from("activity_editors")
    .select("activity_id, user_id, assigned_at, assigned_by_user_id")
    .eq("activity_id", activityId);
  if (error) return internal(error.message);
  const dtos = (rows || []).map(toActivityEditorDTO);
  return { data: dtos };
}

/** Assign a new editor (admin only) */
export async function assignEditor(
  supabase: SupabaseClient,
  activityId: UUID,
  targetUserId: UUID,
  actorUserId: UUID | undefined
): Promise<ApiResponse<ActivityEditorDTO>> {
  const effectiveUserId = actorUserId || (DEFAULT_USER_ID as UUID);
  const activity = await fetchActivity(supabase, activityId);
  if (!activity || activity.deleted_at) return activityNotFound();
  const actorMembership = await fetchMembership(supabase, activity.group_id, effectiveUserId);
  if (!actorMembership) return userNotInGroup({ activity_id: activityId, actor: effectiveUserId });
  if (actorMembership.role !== "admin") return forbiddenRole();

  const targetMembership = await fetchMembership(supabase, activity.group_id, targetUserId);
  if (!targetMembership) return userNotInGroup({ target: targetUserId });

  // Check duplicate
  const { data: existing, error: existingErr } = await supabase
    .from("activity_editors")
    .select("activity_id")
    .eq("activity_id", activityId)
    .eq("user_id", targetUserId);
  if (existingErr) return internal(existingErr.message);
  if (existing && existing.length > 0) return alreadyAssigned({ activity_id: activityId, user_id: targetUserId });

  const insertPayload = {
    activity_id: activityId,
    user_id: targetUserId,
    assigned_at: new Date().toISOString(),
    assigned_by_user_id: effectiveUserId,
  };
  const { data: inserted, error: insErr } = await supabase
    .from("activity_editors")
    .insert(insertPayload)
    .select("activity_id, user_id, assigned_at, assigned_by_user_id")
    .maybeSingle();
  if (insErr || !inserted) {
    // If conflict returned by DB (PK violation) map to alreadyAssigned
    if (insErr?.code === "23505") return alreadyAssigned();
    return conflict(insErr?.message || "Insert failed");
  }
  return { data: toActivityEditorDTO(inserted) };
}

/** Remove an existing editor assignment (admin only) */
export async function removeEditor(
  supabase: SupabaseClient,
  activityId: UUID,
  targetUserId: UUID,
  actorUserId: UUID | undefined
): Promise<ApiResponse<{ activity_id: UUID; user_id: UUID }>> {
  const effectiveUserId = actorUserId || (DEFAULT_USER_ID as UUID);
  const activity = await fetchActivity(supabase, activityId);
  if (!activity || activity.deleted_at) return activityNotFound();
  const actorMembership = await fetchMembership(supabase, activity.group_id, effectiveUserId);
  if (!actorMembership) return userNotInGroup({ activity_id: activityId, actor: effectiveUserId });
  if (actorMembership.role !== "admin") return forbiddenRole();

  // Verify assignment exists first
  const { data: existing, error: existingErr } = await supabase
    .from("activity_editors")
    .select("activity_id, user_id")
    .eq("activity_id", activityId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (existingErr) return internal(existingErr.message);
  if (!existing) return notFound("Editor assignment");

  const { error: delErr } = await supabase
    .from("activity_editors")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", targetUserId);
  if (delErr) return internal(delErr.message);
  return { data: { activity_id: activityId, user_id: targetUserId } };
}
