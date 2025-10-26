import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type {
  ActivityScheduleDTO,
  ActivityScheduleCreateCommand,
  ActivityScheduleUpdateCommand,
  ApiResponse,
  ApiListResponse,
  UUID,
} from "../../types";
import {
  activityScheduleCreateSchema,
  activityScheduleUpdateSchema,
  type ActivityScheduleCreateInput,
  type ActivityScheduleUpdateInput,
} from "../validation/activitySchedule";
import { mapActivityScheduleRowToDTO } from "../mappers/activity-schedule.mapper";
import { errors } from "../errors";

// Internal helpers (pattern modeled after camp-days.service)
function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

interface UserGroupPermissions {
  role: string | null;
}
async function fetchUserGroupPermissions(
  supabase: SupabaseClient,
  groupId: UUID,
  userId: UUID
): Promise<UserGroupPermissions> {
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { role: null };
  return data ?? { role: null };
}

async function fetchCampDayGroupId(
  supabase: SupabaseClient,
  campDayId: UUID
): Promise<{ id: UUID; group_id: UUID } | null> {
  const { data, error } = await supabase.from("camp_days").select("id, group_id").eq("id", campDayId).maybeSingle();
  if (error || !data) return null;
  return data as { id: UUID; group_id: UUID };
}

async function fetchActivityGroupId(
  supabase: SupabaseClient,
  activityId: UUID
): Promise<{ id: UUID; group_id: UUID; deleted_at: string | null } | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, group_id, deleted_at")
    .eq("id", activityId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: UUID; group_id: UUID; deleted_at: string | null };
}

// Semantic HH:MM comparison; naive lexicographic works for HH:MM
function isEndAfterStart(start: string, end: string): boolean {
  return end > start; // "09:30" > "08:15" etc.
}

// ==== CREATE ====
export async function createActivitySchedule(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  campDayId: UUID,
  input: unknown
): Promise<ApiResponse<ActivityScheduleDTO>> {
  const authUserId = effectiveUserId(userId);
  const campDay = await fetchCampDayGroupId(supabase, campDayId);
  if (!campDay) return errors.notFound("CampDay");

  const perms = await fetchUserGroupPermissions(supabase, campDay.group_id, authUserId);
  if (!perms.role) return errors.notFound("CampDay"); // mask
  if (perms.role !== "admin" && perms.role !== "editor") return errors.forbiddenRole();

  const parsed = activityScheduleCreateSchema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const data: ActivityScheduleCreateInput = parsed.data;

  // Ensure activity exists, same group, not deleted
  const activity = await fetchActivityGroupId(supabase, data.activity_id as UUID);
  if (!activity || activity.group_id !== campDay.group_id || activity.deleted_at) {
    return errors.notFound("Activity"); // mask cross-group or deleted
  }

  // Semantic time validation
  if (!isEndAfterStart(data.start_time, data.end_time)) {
    return errors.validation({ end_time: "end_time must be > start_time" });
  }

  const insertPayload: ActivityScheduleCreateCommand = {
    activity_id: data.activity_id as UUID,
    start_time: data.start_time,
    end_time: data.end_time,
    order_in_day: data.order_in_day,
  };

  const { data: rows, error } = await supabase
    .from("activity_schedules")
    .insert({ ...insertPayload, camp_day_id: campDayId })
    .select("*");
  if (error) {
    const msg = error.message || "insert failed";
    if (msg.includes("activity_schedules_camp_day_id_order_in_day_key") || msg.toLowerCase().includes("order_in_day")) {
      return errors.orderInDayConflict();
    }
    return errors.internal(msg);
  }
  if (!rows || rows.length === 0) return errors.internal("insert returned empty result");
  return { data: mapActivityScheduleRowToDTO(rows[0]) };
}

// ==== LIST ====
export async function listActivitySchedules(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  campDayId: UUID
): Promise<ApiListResponse<ActivityScheduleDTO>> {
  const authUserId = effectiveUserId(userId);
  const campDay = await fetchCampDayGroupId(supabase, campDayId);
  if (!campDay) return errors.notFound("CampDay");
  const perms = await fetchUserGroupPermissions(supabase, campDay.group_id, authUserId);
  if (!perms.role) return errors.notFound("CampDay");

  const { data: rows, error } = await supabase
    .from("activity_schedules")
    .select("*")
    .eq("camp_day_id", campDayId)
    .order("order_in_day", { ascending: true });
  if (error) return errors.internal(error.message);
  const dtos = (rows ?? []).map(mapActivityScheduleRowToDTO);
  return { data: dtos, count: dtos.length };
}

// ==== UPDATE (PATCH) ====
export async function updateActivitySchedule(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  scheduleId: UUID,
  input: unknown
): Promise<ApiResponse<ActivityScheduleDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: existing, error: fetchErr } = await supabase
    .from("activity_schedules")
    .select("*")
    .eq("id", scheduleId)
    .maybeSingle();
  if (fetchErr) return errors.internal(fetchErr.message);
  if (!existing) return errors.notFound("ActivitySchedule");

  // Need group_id via camp day
  const campDay = await fetchCampDayGroupId(supabase, existing.camp_day_id as UUID);
  if (!campDay) return errors.notFound("CampDay");
  const perms = await fetchUserGroupPermissions(supabase, campDay.group_id, authUserId);
  if (!perms.role) return errors.notFound("ActivitySchedule");
  if (perms.role !== "admin" && perms.role !== "editor") return errors.forbiddenRole();

  const parsed = activityScheduleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const data: ActivityScheduleUpdateInput = parsed.data;

  if (Object.keys(data).length === 0) {
    return errors.badRequest("No updatable fields provided");
  }

  // If both times provided check semantic ordering
  if (data.start_time && data.end_time && !isEndAfterStart(data.start_time, data.end_time)) {
    return errors.validation({ end_time: "end_time must be > start_time" });
  }

  const updatePayload: ActivityScheduleUpdateCommand = {};
  if (data.start_time !== undefined) updatePayload.start_time = data.start_time;
  if (data.end_time !== undefined) updatePayload.end_time = data.end_time;
  if (data.order_in_day !== undefined) updatePayload.order_in_day = data.order_in_day;

  const { data: updated, error: updErr } = await supabase
    .from("activity_schedules")
    .update(updatePayload)
    .eq("id", scheduleId)
    .select("*")
    .maybeSingle();
  if (updErr) {
    const msg = updErr.message || "update failed";
    if (msg.includes("activity_schedules_camp_day_id_order_in_day_key") || msg.toLowerCase().includes("order_in_day")) {
      return errors.orderInDayConflict();
    }
    return errors.internal(msg);
  }
  if (!updated) return errors.internal("update returned empty result");
  return { data: mapActivityScheduleRowToDTO(updated) };
}

// ==== DELETE ====
export async function deleteActivitySchedule(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  scheduleId: UUID
): Promise<ApiResponse<{ id: UUID }>> {
  const authUserId = effectiveUserId(userId);
  const { data: existing, error: fetchErr } = await supabase
    .from("activity_schedules")
    .select("id, camp_day_id")
    .eq("id", scheduleId)
    .maybeSingle();
  if (fetchErr) return errors.internal(fetchErr.message);
  if (!existing) return errors.notFound("ActivitySchedule");

  const campDay = await fetchCampDayGroupId(supabase, existing.camp_day_id as UUID);
  if (!campDay) return errors.notFound("CampDay");
  const perms = await fetchUserGroupPermissions(supabase, campDay.group_id, authUserId);
  if (!perms.role) return errors.notFound("ActivitySchedule");
  if (perms.role !== "admin" && perms.role !== "editor") return errors.forbiddenRole();

  const { data: deletedRows, error: delErr } = await supabase
    .from("activity_schedules")
    .delete()
    .eq("id", scheduleId)
    .select("id");
  if (delErr) return errors.internal(delErr.message);
  if (!deletedRows || deletedRows.length === 0) return errors.internal("delete returned empty result");
  return { data: { id: deletedRows[0].id as UUID } };
}

// TODO: Future overlapping time detection (requires analyzing existing slots)
// export function detectOverlap(...) => errors.overlappingTime()
