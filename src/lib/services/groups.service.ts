import type { SupabaseClient } from "../../db/supabase.client";
import type { GroupDTO, ApiResponse, GroupCreateCommand, ApiListResponse } from "../../types";
import { groupCreateSchema, type GroupCreateInput } from "../validation/group";
import { mapGroupRowToDTO } from "../mappers/group.mapper";
import { errors } from "../errors";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

// Business constant (assumption) - can be externalized later
const MAX_GROUPS_PER_USER = 20;

export async function createGroup(
  supabase: SupabaseClient,
  userId: string | undefined,
  input: unknown
): Promise<ApiResponse<GroupDTO>> {
  // TEMP AUTH FALLBACK: until proper auth/session implemented we fallback to DEFAULT_USER_ID
  const effectiveUserId = userId || DEFAULT_USER_ID;
  // 1. Schema validation
  const parsed = groupCreateSchema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const data: GroupCreateInput = parsed.data;

  // 2. Additional business validations (date range already covered in superRefine, but explicit error code for date range)
  if (data.end_date < data.start_date) {
    return errors.dateRangeInvalid();
  }

  // 3. Group limit per user
  const { count: existingCount, error: countErr } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("created_by", effectiveUserId)
    .is("deleted_at", null);
  if (countErr) {
    return errors.internal("Failed to verify group limit");
  }
  if ((existingCount ?? 0) >= MAX_GROUPS_PER_USER) {
    return errors.groupLimitReached(existingCount ?? 0, MAX_GROUPS_PER_USER);
  }

  // 4. Insert group
  const insertPayload = {
    name: data.name,
    description: data.description,
    lore_theme: data.lore_theme,
    start_date: data.start_date,
    end_date: data.end_date,
    max_members: data.max_members ?? undefined,
  };

  const fullInsertRow: GroupCreateCommand = {
    ...insertPayload,
    created_by: effectiveUserId,
    updated_by: effectiveUserId,
  };

  const { data: insertedRows, error: insertErr } = await supabase.from("groups").insert(fullInsertRow).select();

  if (insertErr) {
    // Debug log wycofany – pozostawiamy tylko błąd
    return errors.internal("Failed to create group (DB)");
  }
  if (!insertedRows || insertedRows.length === 0) {
    return errors.internal("Failed to create group (empty result)");
  }

  const groupRow = insertedRows[0];

  // 5. Insert membership (admin). Future improvement: transaction/RPC for atomicity.
  const { error: membershipErr } = await supabase.from("group_memberships").insert({
    group_id: groupRow.id,
    user_id: effectiveUserId,
    role: "admin",
  });
  if (membershipErr) {
    return errors.internal("Failed to establish admin membership");
  }

  // 6. Map to DTO
  const dto = mapGroupRowToDTO(groupRow);
  return { data: dto };
}

// List all groups (non-deleted). Future: pagination & filters.
export async function listGroups(supabase: SupabaseClient): Promise<ApiListResponse<GroupDTO>> {
  const { data: rows, error: listErr } = await supabase
    .from("groups")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (listErr) {
    return errors.internal("Failed to list groups");
  }
  const dtos = (rows ?? []).map(mapGroupRowToDTO);
  return { data: dtos, count: dtos.length };
}
