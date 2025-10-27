import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type {
  ApiResponse,
  ApiListResponse,
  GroupTaskDTO,
  GroupTaskCreateCommand,
  GroupTaskUpdateCommand,
  UUID,
} from "../../types";
import { errors } from "../errors";
import { mapGroupTaskRow } from "../mappers/group-task.mapper";
import { parseGroupTaskCursor, nextGroupTaskCursorFromPage } from "../utils";

export interface GroupTasksListFilters {
  status?: string;
  activity_id?: string;
  limit?: number;
  cursor?: string;
}

function unauthorized<T>(): ApiResponse<T> {
  return errors.unauthorized();
}
function forbidden<T>(): ApiResponse<T> {
  return errors.forbiddenRole();
}
function internal<T>(message?: string): ApiResponse<T> {
  return errors.internal(message);
}
function taskNotFound<T>(): ApiResponse<T> {
  return errors.taskNotFound();
}

// Membership & role fetch via view user_group_permissions
async function fetchUserGroupPermissions(
  supabase: SupabaseClient,
  groupId: UUID,
  userId: UUID
): Promise<{ role: string | null }> {
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { role: null };
  return { role: data?.role ?? null };
}

function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

export async function createGroupTask(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  groupId: UUID,
  cmd: GroupTaskCreateCommand
): Promise<ApiResponse<GroupTaskDTO>> {
  const authUserId = effectiveUserId(userId);
  const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
  if (!perms.role) return unauthorized();
  if (!(perms.role === "admin" || perms.role === "editor")) return forbidden();

  // Optional activity_id validation
  if (cmd.activity_id) {
    const { data: act, error: actErr } = await supabase
      .from("activities")
      .select("id, group_id")
      .eq("id", cmd.activity_id)
      .maybeSingle();
    if (actErr) return internal(actErr.message);
    if (!act) return errors.badRequest("Bad request", { activity_id: "not_found" });
    if (act.group_id !== groupId) return errors.badRequest("Bad request", { activity_id: "mismatched_group" });
  }

  const insertPayload = {
    group_id: groupId,
    activity_id: cmd.activity_id ?? null,
    title: cmd.title,
    description: cmd.description,
    due_date: cmd.due_date ?? null,
    status: "pending",
    created_by: authUserId,
    updated_by: authUserId,
  };

  const { data, error } = await supabase.from("group_tasks").insert(insertPayload).select("*").maybeSingle();
  if (error || !data) return internal(error?.message || "insert failed");
  return { data: mapGroupTaskRow(data) };
}

export async function listGroupTasks(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  groupId: UUID,
  filters: GroupTasksListFilters
): Promise<ApiListResponse<GroupTaskDTO>> {
  const authUserId = effectiveUserId(userId);
  const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
  if (!perms.role) return unauthorized();

  const limit = filters.limit ?? 20;
  const base = supabase.from("group_tasks").select("*").eq("group_id", groupId);

  if (filters.status) base.eq("status", filters.status);
  if (filters.activity_id) base.eq("activity_id", filters.activity_id);
  if (filters.cursor) {
    const parsed = parseGroupTaskCursor(filters.cursor);
    if (parsed) {
      base.or(`created_at.lt.${parsed.created_at},and(created_at.eq.${parsed.created_at},id.lt.${parsed.id})`);
    }
  }

  base.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);

  const { data: rows, error } = await base;
  if (error) return internal(error.message);
  if (!rows) return { data: [] };
  const dtos = rows.map(mapGroupTaskRow);
  const nextCursor = nextGroupTaskCursorFromPage(rows);
  return { data: dtos, nextCursor };
}

export async function getGroupTask(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  taskId: UUID
): Promise<ApiResponse<GroupTaskDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("group_tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) return internal(error.message);
  if (!row) return taskNotFound();
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  return { data: mapGroupTaskRow(row) };
}

const GROUP_TASK_UPDATE_COLUMNS = ["title", "description", "due_date", "status", "activity_id"] as const;

export async function updateGroupTask(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  taskId: UUID,
  cmd: GroupTaskUpdateCommand
): Promise<ApiResponse<GroupTaskDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("group_tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) return internal(error.message);
  if (!row) return taskNotFound();
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  if (!(perms.role === "admin" || perms.role === "editor")) return forbidden();

  // Validate activity_id transitions
  if (cmd.activity_id !== undefined) {
    if (cmd.activity_id === null) {
      // Remove association
    } else {
      const { data: act, error: actErr } = await supabase
        .from("activities")
        .select("id, group_id")
        .eq("id", cmd.activity_id)
        .maybeSingle();
      if (actErr) return internal(actErr.message);
      if (!act) return errors.badRequest("Bad request", { activity_id: "not_found" });
      if (act.group_id !== row.group_id) return errors.badRequest("Bad request", { activity_id: "mismatched_group" });
    }
  }

  interface UpdatePayloadRow {
    title?: string;
    description?: string;
    due_date?: string | null;
    status?: string;
    activity_id?: string | null;
    updated_by?: string;
  }
  const updatePayload: UpdatePayloadRow = { updated_by: authUserId };
  GROUP_TASK_UPDATE_COLUMNS.forEach((col) => {
    const value = (cmd as Record<string, unknown>)[col];
    if (value !== undefined) {
      // Special case: due_date/activity_id can be null
      (updatePayload as Record<string, unknown>)[col] = value;
    }
  });

  const { data: updatedRow, error: updErr } = await supabase
    .from("group_tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select("*")
    .maybeSingle();
  if (updErr || !updatedRow) return internal(updErr?.message || "update failed");
  return { data: mapGroupTaskRow(updatedRow) };
}

export async function deleteGroupTask(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  taskId: UUID
): Promise<ApiResponse<{ id: UUID }>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("group_tasks").select("id, group_id").eq("id", taskId).maybeSingle();
  if (error) return internal(error.message);
  if (!row) return taskNotFound();
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return unauthorized();
  if (!(perms.role === "admin" || perms.role === "editor")) return forbidden();

  const { error: delErr } = await supabase.from("group_tasks").delete().eq("id", taskId);
  if (delErr) return internal(delErr.message);
  return { data: { id: taskId } };
}
