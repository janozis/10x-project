import type { SupabaseClient } from "../../db/supabase.client"; // Local Supabase client type for consistency
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type {
  ActivityCreateCommand,
  ActivityUpdateCommand,
  ApiResponse,
  ApiListResponse,
  ActivityWithEditorsDTO,
  UUID,
  TimestampISO,
} from "../../types";
import { mapActivityRow } from "../mappers/activity.mapper";
import { parseActivityCursor, nextActivityCursorFromPage } from "../utils";
import { errors } from "../errors";

// Local filters interface from implementation plan
export interface ActivitiesListFilters {
  status?: string;
  assigned?: "me";
  search?: string;
  limit?: number;
  cursor?: string;
}

// Whitelisted update columns for PATCH
const ACTIVITY_UPDATE_COLUMNS = [
  "title",
  "objective",
  "tasks",
  "duration_minutes",
  "location",
  "materials",
  "responsible",
  "knowledge_scope",
  "participants",
  "flow",
  "summary",
  "status",
] as const;

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

// Helper: check membership & role via view user_group_permissions (assumes populated by RLS policies)
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

export async function createActivity(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  groupId: UUID,
  cmd: ActivityCreateCommand
): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  const authUserId = effectiveUserId(userId);
  const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
  if (!perms.role) return unauthorized();
  if (!(perms.role === "admin" || perms.role === "editor")) return forbidden();
  const insertPayload = {
    ...cmd,
    group_id: groupId,
    status: "draft",
    created_by: authUserId,
    updated_by: authUserId,
  };
  const { data, error } = await supabase.from("activities").insert(insertPayload).select("*").maybeSingle();
  if (error || !data) return internal(error?.message || "insert failed");
  return { data: mapActivityRow(data, []) };
}

export async function listActivities(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  groupId: UUID,
  filters: ActivitiesListFilters
): Promise<ApiListResponse<ActivityWithEditorsDTO>> {
  const authUserId = effectiveUserId(userId);
  const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
  if (!perms.role) return unauthorized();

  const limit = filters.limit ?? 20;
  const base = supabase.from("activities").select("*").eq("group_id", groupId).is("deleted_at", null);

  if (filters.status) base.eq("status", filters.status);

  if (filters.search) {
    // Simple ILIKE on title & objective
    base.or(`title.ilike.%${filters.search}%,objective.ilike.%${filters.search}%`);
  }

  if (filters.cursor) {
    const parsed = parseActivityCursor(filters.cursor);
    if (parsed) {
      // We sort DESC, so cursor acts as 'created_at < cursor.created_at OR (created_at = cursor.created_at AND id < cursor.id)'
      base.or(`created_at.lt.${parsed.created_at},and(created_at.eq.${parsed.created_at},id.lt.${parsed.id})`);
    }
  }

  // Order newest first for stability
  base.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);

  if (filters.assigned === "me") {
    // Need to filter by editors membership. We'll fetch all then reduce by second query. Alternative: join RPC later.
  }

  const { data: rows, error } = await base;
  if (error) return internal(error.message);
  if (!rows) return { data: [] };

  const activityIds = rows.map((r) => r.id);
  interface EditorRow {
    activity_id: string;
    assigned_at: string;
    assigned_by_user_id: string;
    user_id: string;
  }
  const editorsMap: Record<string, EditorRow[]> = {};
  if (activityIds.length) {
    const { data: editorRows, error: editorsErr } = await supabase
      .from("activity_editors")
      .select("activity_id, assigned_at, assigned_by_user_id, user_id")
      .in("activity_id", activityIds);
    if (editorsErr) return internal(editorsErr.message);
    (editorRows || []).forEach((r) => {
      (editorsMap[r.activity_id] ||= []).push(r);
    });
  }

  let filteredRows = rows;
  if (filters.assigned === "me") {
    filteredRows = rows.filter((r) => (editorsMap[r.id] || []).some((e) => e.user_id === authUserId));
  }

  const dtos = filteredRows.map((r) => mapActivityRow(r, editorsMap[r.id] || []));
  const nextCursor = nextActivityCursorFromPage(filteredRows);
  return { data: dtos, nextCursor };
}

export async function getActivity(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  activityId: UUID
): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  const authUserId = effectiveUserId(userId);
  // Fetch activity and related group_id to verify membership
  const { data: row, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return internal(error.message);
  if (!row) return notFound("Activity");
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  const { data: editorRows, error: editorsErr } = await supabase
    .from("activity_editors")
    .select("*")
    .eq("activity_id", activityId);
  if (editorsErr) return internal(editorsErr.message);
  return { data: mapActivityRow(row, editorRows || []) };
}

export async function updateActivity(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  activityId: UUID,
  cmd: ActivityUpdateCommand
): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (error) return internal(error.message);
  if (!row || row.deleted_at) return notFound("Activity");
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  if (perms.role !== "admin") {
    const { data: editorAssignRows, error: editorErr } = await supabase
      .from("activity_editors")
      .select("user_id")
      .eq("activity_id", activityId)
      .eq("user_id", authUserId);
    if (editorErr) return internal(editorErr.message);
    if (!editorAssignRows || editorAssignRows.length === 0) return forbidden();
  }
  interface ActivityUpdateRow {
    title?: string;
    objective?: string;
    tasks?: string;
    duration_minutes?: number;
    location?: string;
    materials?: string;
    responsible?: string;
    knowledge_scope?: string;
    participants?: string;
    flow?: string;
    summary?: string;
    status?: string;
    updated_by?: string;
  }
  const updatePayload: ActivityUpdateRow = { updated_by: authUserId };
  ACTIVITY_UPDATE_COLUMNS.forEach((col) => {
    const value = (cmd as Record<string, unknown>)[col];
    if (value !== undefined) {
      (updatePayload as Record<string, unknown>)[col] = value;
    }
  });
  const { data: updatedRow, error: updErr } = await supabase
    .from("activities")
    .update(updatePayload)
    .eq("id", activityId)
    .select("*")
    .maybeSingle();
  if (updErr || !updatedRow) return internal(updErr?.message || "update failed");
  const { data: editorRows, error: editorRowsErr } = await supabase
    .from("activity_editors")
    .select("*")
    .eq("activity_id", activityId);
  if (editorRowsErr) return internal(editorRowsErr.message);
  return { data: mapActivityRow(updatedRow, editorRows || []) };
}

export async function softDeleteActivity(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  activityId: UUID
): Promise<ApiResponse<{ id: UUID; deleted_at: TimestampISO }>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase
    .from("activities")
    .select("id, group_id, deleted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (error) return internal(error.message);
  if (!row || row.deleted_at) return notFound("Activity");
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  if (perms.role !== "admin") return forbidden();
  const { data: deletedRow, error: delErr } = await supabase
    .from("activities")
    .update({ deleted_at: new Date().toISOString(), updated_by: authUserId })
    .eq("id", activityId)
    .select("id, deleted_at")
    .maybeSingle();
  if (delErr || !deletedRow) return internal(delErr?.message || "delete failed");
  return { data: { id: deletedRow.id as UUID, deleted_at: deletedRow.deleted_at as TimestampISO } };
}

export async function restoreActivity(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  activityId: UUID
): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (error) return internal(error.message);
  if (!row || !row.deleted_at) return notFound("Activity");
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  if (perms.role !== "admin") return forbidden();
  const { data: restoredRow, error: restoreErr } = await supabase
    .from("activities")
    .update({ deleted_at: null, updated_by: authUserId })
    .eq("id", activityId)
    .select("*")
    .maybeSingle();
  if (restoreErr || !restoredRow) return internal(restoreErr?.message || "restore failed");
  const { data: editorRows, error: editorsErr } = await supabase
    .from("activity_editors")
    .select("*")
    .eq("activity_id", activityId);
  if (editorsErr) return internal(editorsErr.message);
  return { data: mapActivityRow(restoredRow, editorRows || []) };
}
