import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type { CampDayDTO, CampDayUpdateCommand, ApiResponse, ApiListResponse, UUID } from "../../types";
import {
  campDayCreateSchema,
  campDayUpdateSchema,
  type CampDayCreateInput,
  type CampDayUpdateInput,
} from "../validation/campDay";
import { mapCampDayRowToDTO } from "../mappers/camp-day.mapper";
import { errors } from "../errors";

// Helpers mirroring patterns from activities.service (some simplified for masking semantics)
function forbidden<T>(): ApiResponse<T> {
  return errors.forbiddenRole();
}
function notFound<T>(entity = "CampDay"): ApiResponse<T> {
  return errors.notFound(entity);
}
function internal<T>(message?: string): ApiResponse<T> {
  return errors.internal(message);
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

function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

// Fetch group row minimal fields needed for range checks & membership masking.
async function fetchGroupForCampDays(
  supabase: SupabaseClient,
  groupId: UUID
): Promise<{ id: UUID; start_date: string; end_date: string } | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("id, start_date, end_date")
    .eq("id", groupId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: UUID; start_date: string; end_date: string };
}

// Business rule: date must fall within group.start_date..group.end_date inclusive.
function isDateWithinGroup(date: string, group: { start_date: string; end_date: string }): boolean {
  return date >= group.start_date && date <= group.end_date;
}

// CREATE
// CREATE (no created_by/updated_by columns on camp_days table)
export async function createCampDay(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  groupId: UUID,
  input: unknown
): Promise<ApiResponse<CampDayDTO>> {
  const authUserId = effectiveUserId(userId);
  const group = await fetchGroupForCampDays(supabase, groupId);
  if (!group) return notFound("Group");
  const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
  if (!perms.role) return notFound("Group"); // mask membership absence
  if (perms.role !== "admin") return forbidden();

  // Validate body
  const parsed = campDayCreateSchema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const data: CampDayCreateInput = parsed.data;

  // Range checks (these duplicate schema min/max to emit domain-specific codes if needed)
  if (data.day_number < 1 || data.day_number > 30) {
    return errors.dayOutOfRange();
  }
  if (!isDateWithinGroup(data.date, group)) {
    return errors.dateOutOfGroupRange();
  }

  const insertPayload = {
    group_id: groupId,
    day_number: data.day_number,
    date: data.date,
    theme: data.theme ?? null,
  };

  const { data: insertedRows, error: insertErr } = await supabase.from("camp_days").insert(insertPayload).select();
  if (insertErr) {
    // Unique violation mapping (Postgres code 23505 typically). Supabase error details may include constraint name.
    const msg = insertErr.message || "insert failed";
    if (msg.includes("camp_days_group_id_day_number_key") || msg.toLowerCase().includes("duplicate")) {
      return errors.duplicateDayNumber();
    }
    return internal(msg);
  }
  if (!insertedRows || insertedRows.length === 0) return internal("insert returned empty result");
  return { data: mapCampDayRowToDTO(insertedRows[0]) };
}

// LIST
export async function listCampDays(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  groupId: UUID
): Promise<ApiListResponse<CampDayDTO>> {
  const authUserId = effectiveUserId(userId);
  const group = await fetchGroupForCampDays(supabase, groupId);
  if (!group) return notFound("Group");
  const perms = await fetchUserGroupPermissions(supabase, groupId, authUserId);
  if (!perms.role) return notFound("Group");

  const { data: rows, error } = await supabase
    .from("camp_days")
    .select("*")
    .eq("group_id", groupId)
    .order("day_number", { ascending: true });
  if (error) return internal(error.message);
  const dtos = (rows ?? []).map(mapCampDayRowToDTO);
  return { data: dtos, count: dtos.length };
}

// GET single
export async function getCampDay(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  campDayId: UUID
): Promise<ApiResponse<CampDayDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error } = await supabase.from("camp_days").select("*").eq("id", campDayId).maybeSingle();
  if (error) return internal(error.message);
  if (!row) return notFound("CampDay");
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return notFound("CampDay");
  return { data: mapCampDayRowToDTO(row) };
}

// UPDATE (PATCH)
export async function updateCampDay(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  campDayId: UUID,
  input: unknown
): Promise<ApiResponse<CampDayDTO>> {
  const authUserId = effectiveUserId(userId);
  const { data: existing, error: fetchErr } = await supabase
    .from("camp_days")
    .select("*")
    .eq("id", campDayId)
    .maybeSingle();
  if (fetchErr) return internal(fetchErr.message);
  if (!existing) return notFound("CampDay");
  const perms = await fetchUserGroupPermissions(supabase, existing.group_id, authUserId);
  if (!perms.role) return notFound("CampDay");
  if (perms.role !== "admin") return forbidden();

  const parsed = campDayUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const data: CampDayUpdateInput = parsed.data;

  // If date provided, check range
  if (data.date) {
    const group = await fetchGroupForCampDays(supabase, existing.group_id);
    if (!group) return notFound("Group"); // Should not happen except race
    if (!isDateWithinGroup(data.date, group)) {
      return errors.dateOutOfGroupRange();
    }
  }

  const updatePayload: CampDayUpdateCommand = {};
  if (data.date !== undefined) updatePayload.date = data.date;
  if (data.theme !== undefined) updatePayload.theme = data.theme; // allow null clearing
  if (Object.keys(updatePayload).length === 0) {
    // No updatable fields provided -> return existing
    return { data: mapCampDayRowToDTO(existing) };
  }

  const { data: updatedRow, error: updErr } = await supabase
    .from("camp_days")
    .update(updatePayload)
    .eq("id", campDayId)
    .select("*")
    .maybeSingle();
  if (updErr || !updatedRow) return internal(updErr?.message || "update failed");
  return { data: mapCampDayRowToDTO(updatedRow) };
}

// DELETE (hard)
export async function deleteCampDay(
  supabase: SupabaseClient,
  userId: UUID | undefined,
  campDayId: UUID
): Promise<ApiResponse<{ id: UUID }>> {
  const authUserId = effectiveUserId(userId);
  const { data: row, error: fetchErr } = await supabase
    .from("camp_days")
    .select("id, group_id")
    .eq("id", campDayId)
    .maybeSingle();
  if (fetchErr) return internal(fetchErr.message);
  if (!row) return notFound("CampDay");
  const perms = await fetchUserGroupPermissions(supabase, row.group_id, authUserId);
  if (!perms.role) return notFound("CampDay");
  if (perms.role !== "admin") return forbidden();

  const { data: deletedRows, error: delErr } = await supabase
    .from("camp_days")
    .delete()
    .eq("id", campDayId)
    .select("id");
  if (delErr) return internal(delErr.message);
  if (!deletedRows || deletedRows.length === 0) return internal("delete returned empty result");
  return { data: { id: deletedRows[0].id as UUID } };
}
