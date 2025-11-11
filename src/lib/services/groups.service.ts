import type { SupabaseClient } from "../../db/supabase.client";
import type { GroupDTO, ApiResponse, ApiListResponse, UUID, GroupStatus } from "../../types";
import {
  groupCreateSchema,
  groupUpdateSchema,
  type GroupCreateInput,
  type GroupUpdateInput,
} from "../validation/group";
import { mapGroupRowToDTO } from "../mappers/group.mapper";
import { errors } from "../errors";
import { parseGroupCursor, nextGroupCursorFromPage } from "../utils";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { z } from "zod";

// Business constant (assumption) - can be externalized later
const MAX_GROUPS_PER_USER = 20;

export async function createGroup(
  supabase: SupabaseClient,
  userId: string | undefined,
  input: unknown
): Promise<ApiResponse<GroupDTO>> {
  const debugEnabled = import.meta.env.ENABLE_DEBUG_LOGS === "true";

  // TEMP AUTH FALLBACK: until proper auth/session implemented we fallback to DEFAULT_USER_ID
  const effectiveUserId = userId || DEFAULT_USER_ID;

  if (debugEnabled) {
    console.log("[createGroup] Starting with userId:", effectiveUserId);
    console.log("[createGroup] Input:", input);
  }

  // 1. Schema validation
  const parsed = groupCreateSchema.safeParse(input);
  if (!parsed.success) {
    if (debugEnabled) {
      console.error("[createGroup] Validation failed:", parsed.error.flatten());
    }
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

  if (debugEnabled) {
    console.log("[createGroup] Existing groups count:", existingCount, "error:", countErr);
  }

  if (countErr) {
    if (debugEnabled) {
      console.error("[createGroup] Count error details:", {
        message: countErr.message,
        code: countErr.code,
        details: countErr.details,
        hint: countErr.hint,
      });
    }
    return errors.internal("Failed to verify group limit");
  }
  if ((existingCount ?? 0) >= MAX_GROUPS_PER_USER) {
    return errors.groupLimitReached(existingCount ?? 0, MAX_GROUPS_PER_USER);
  }

  // 4. Insert group using RPC function (workaround for RLS issue)
  const inviteCode = generateInviteCode(); // Auto-generate invite code on creation

  if (debugEnabled) {
    console.log("[createGroup] Calling create_group_with_membership RPC with:", {
      name: data.name,
      description: data.description,
      lore_theme: data.lore_theme,
      start_date: data.start_date,
      end_date: data.end_date,
      max_members: data.max_members,
      invite_code: inviteCode,
    });
  }

  // Call RPC function that bypasses RLS using SECURITY DEFINER
  const { data: groupData, error: rpcErr } = await supabase.rpc("create_group_with_membership", {
    p_name: data.name,
    p_description: data.description,
    p_lore_theme: data.lore_theme,
    p_start_date: data.start_date,
    p_end_date: data.end_date,
    p_max_members: data.max_members ?? null,
    p_invite_code: inviteCode,
  });

  if (rpcErr) {
    if (debugEnabled) {
      console.error("[createGroup] RPC error details:", {
        message: rpcErr.message,
        code: rpcErr.code,
        details: rpcErr.details,
        hint: rpcErr.hint,
      });
    }
    return errors.internal("Failed to create group (RPC)");
  }

  if (!groupData) {
    if (debugEnabled) {
      console.error("[createGroup] RPC returned empty result");
    }
    return errors.internal("Failed to create group (empty result)");
  }

  if (debugEnabled) {
    console.log("[createGroup] Group created successfully via RPC:", groupData.id);
  }

  // 5. Map to DTO (groupData is already the group row from RPC)
  const dto = mapGroupRowToDTO(groupData);
  return { data: dto };
}

/**
 * List groups where the authenticated user is a member.
 * Uses group_memberships table to filter only groups the user belongs to.
 */
export async function listGroups(
  supabase: SupabaseClient,
  options?: { deleted?: boolean; limit?: number; cursor?: string }
): Promise<ApiListResponse<GroupDTO>> {
  const debugEnabled = import.meta.env.ENABLE_DEBUG_LOGS === "true";

  if (debugEnabled) {
    console.log("[listGroups] Starting with options:", options);
  }

  // Get list of group IDs where user is a member
  // Note: We rely on RLS policy to filter by auth.uid() automatically
  // The RLS policy allows users to see their own memberships (user_id = auth.uid())
  const { data: memberships, error: membershipErr } = await supabase.from("group_memberships").select("group_id");

  if (debugEnabled) {
    console.log("[listGroups] Memberships query result:", {
      memberships,
      error: membershipErr,
      count: memberships?.length,
    });
  }

  if (membershipErr) {
    if (debugEnabled) {
      console.error("[listGroups] Membership error details:", {
        message: membershipErr.message,
        code: membershipErr.code,
        details: membershipErr.details,
        hint: membershipErr.hint,
      });
    }
    return errors.internal("Failed to fetch user memberships");
  }

  const groupIds = (memberships ?? []).map((m) => m.group_id);

  if (debugEnabled) {
    console.log("[listGroups] Group IDs:", groupIds);
  }

  // If user has no groups, return empty list
  if (groupIds.length === 0) {
    return { data: [], count: 0 };
  }

  // Query groups that user is a member of
  let query = supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options?.deleted) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (options?.cursor) {
    const parsed = parseGroupCursor(options.cursor);
    if (parsed) {
      const { created_at, id } = parsed;
      // created_at < cursor.created_at OR (created_at = cursor.created_at AND id < cursor.id)
      query = query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
    }
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(50);
  }

  const { data: rows, error: listErr } = await query;

  if (debugEnabled) {
    console.log("[listGroups] Groups query result:", {
      rows: rows?.length,
      error: listErr,
    });
  }

  if (listErr) {
    if (debugEnabled) {
      console.error("[listGroups] Groups error details:", {
        message: listErr.message,
        code: listErr.code,
        details: listErr.details,
        hint: listErr.hint,
      });
    }
    return errors.internal("Failed to list groups");
  }
  const dtos = (rows ?? []).map(mapGroupRowToDTO);
  const nextCursor = nextGroupCursorFromPage(rows ?? []);
  return { data: dtos, count: dtos.length, nextCursor };
}

/** Soft delete a group (sets deleted_at). Only creator can delete (basic rule for now). */
export async function softDeleteGroup(
  supabase: SupabaseClient,
  userId: string | undefined,
  groupId: UUID
): Promise<ApiResponse<unknown>> {
  const effectiveUserId = userId || DEFAULT_USER_ID;
  // Verify exists and ownership (basic rule)
  const { data: groupRows, error: findErr } = await supabase
    .from("groups")
    .select("id, created_by, deleted_at")
    .eq("id", groupId)
    .limit(1);
  if (findErr) return errors.internal("Failed to lookup group");
  const row = groupRows?.[0];
  if (!row) return errors.notFound("Group");
  if (row.deleted_at) return { data: {} };
  if (row.created_by !== effectiveUserId) {
    const { data: roleRow, error: roleErr } = await supabase
      .from("group_memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", effectiveUserId)
      .limit(1);
    if (roleErr) return errors.internal("Failed to verify role");
    const role = roleRow?.[0]?.role;
    if (role !== "admin") {
      return errors.forbiddenRole();
    }
  }
  const { error: updateErr } = await supabase
    .from("groups")
    .update({ deleted_at: new Date().toISOString(), updated_by: effectiveUserId })
    .eq("id", groupId);
  if (updateErr) return errors.internal("Failed to delete group");
  return { data: {} };
}

/** Restore a soft-deleted group (clears deleted_at) and return DTO */
export async function restoreGroupById(
  supabase: SupabaseClient,
  userId: string | undefined,
  groupId: UUID
): Promise<ApiResponse<GroupDTO>> {
  const effectiveUserId = userId || DEFAULT_USER_ID;
  const { data: groupRows, error: findErr } = await supabase.from("groups").select("*").eq("id", groupId).limit(1);
  if (findErr) return errors.internal("Failed to lookup group");
  const row = groupRows?.[0];
  if (!row) return errors.notFound("Group");
  if (!row.deleted_at) {
    // Already active; return DTO
    // Only allow if admin or owner
    if (row.created_by !== effectiveUserId) {
      const { data: roleRow, error: roleErr } = await supabase
        .from("group_memberships")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", effectiveUserId)
        .limit(1);
      if (roleErr) return errors.internal("Failed to verify role");
      const role = roleRow?.[0]?.role;
      if (role !== "admin") {
        return errors.forbiddenRole();
      }
    }
    return { data: mapGroupRowToDTO(row) };
  }
  const { data: updated, error: restoreErr } = await supabase
    .from("groups")
    .update({ deleted_at: null, updated_by: effectiveUserId })
    .eq("id", groupId)
    .select("*")
    .limit(1);
  if (restoreErr) return errors.internal("Failed to restore group");
  const restored = updated?.[0];
  if (!restored) return errors.internal("Failed to restore group (empty)");
  return { data: mapGroupRowToDTO(restored) };
}

/** Join a group by invite code */
export async function joinGroupByCode(
  supabase: SupabaseClient,
  userId: string | undefined,
  input: unknown
): Promise<ApiResponse<GroupDTO>> {
  const effectiveUserId = userId || DEFAULT_USER_ID;
  const schema = z.object({ code: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const code = parsed.data.code.toLowerCase();
  // Find group by invite code
  const { data: groups, error: findErr } = await supabase.from("groups").select("*").eq("invite_code", code).limit(1);
  if (findErr) return errors.internal("Failed to find invite");
  const group = groups?.[0];
  if (!group) return errors.notFound("Group");
  // Validate invite
  if (!group.invite_code) return errors.badRequest("Invite not available");
  if (group.invite_expires_at && new Date(group.invite_expires_at).getTime() < Date.now()) {
    return errors.badRequest("Invite expired", { code: "INVITE_EXPIRED" });
  }
  if (
    typeof group.invite_max_uses === "number" &&
    typeof group.invite_current_uses === "number" &&
    group.invite_current_uses >= group.invite_max_uses
  ) {
    return errors.badRequest("Invite maxed", { code: "INVITE_MAXED" });
  }
  // Check membership existence
  const { data: membership, error: memErr } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", group.id)
    .eq("user_id", effectiveUserId)
    .limit(1);
  if (memErr) return errors.internal("Failed to check membership");

  // If user is already a member, return error
  if (membership && membership.length > 0) {
    return errors.badRequest("Already a member of this group", { code: "ALREADY_MEMBER" });
  }

  // Add new membership
  const { error: insertMemErr } = await supabase.from("group_memberships").insert({
    group_id: group.id,
    user_id: effectiveUserId,
    role: "member",
  });
  if (insertMemErr) return errors.internal("Failed to join group");
  // Increment invite usage (best-effort)
  const { error: incErr } = await supabase
    .from("groups")
    .update({ invite_current_uses: (group.invite_current_uses ?? 0) + 1 })
    .eq("id", group.id);
  if (incErr) {
    // continue anyway
  }
  return { data: mapGroupRowToDTO(group) };
}

/** Update group details (PATCH). Admin role required. Returns updated DTO. */
export async function updateGroup(
  supabase: SupabaseClient,
  userId: string | undefined,
  groupId: UUID,
  input: unknown
): Promise<ApiResponse<GroupDTO>> {
  const effectiveUserId = userId || DEFAULT_USER_ID;
  // Parse and validate payload
  const parsed = groupUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return errors.validation(parsed.error.flatten().fieldErrors as Record<string, unknown>);
  }
  const data: GroupUpdateInput = parsed.data;

  // Fetch group and verify admin role
  const { data: groupRow, error: findErr } = await supabase
    .from("groups")
    .select("id, created_by, deleted_at")
    .eq("id", groupId)
    .maybeSingle();
  if (findErr) return errors.internal("Failed to lookup group");
  if (!groupRow) return errors.notFound("Group");
  if (groupRow.created_by !== effectiveUserId) {
    const { data: roleRow, error: roleErr } = await supabase
      .from("group_memberships")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", effectiveUserId)
      .maybeSingle();
    if (roleErr) return errors.internal("Failed to verify role");
    const role = roleRow?.role;
    if (role !== "admin") return errors.forbiddenRole();
  }

  // Additional business validation
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    return errors.dateRangeInvalid();
  }

  // Build update payload
  const allowed: Record<string, unknown> = {};
  if (typeof data.name === "string") allowed.name = data.name;
  if (typeof data.description === "string") allowed.description = data.description;
  if (typeof data.lore_theme === "string") allowed.lore_theme = data.lore_theme;
  if (typeof data.start_date === "string") allowed.start_date = data.start_date;
  if (typeof data.end_date === "string") allowed.end_date = data.end_date;
  if (typeof data.max_members === "number") allowed.max_members = data.max_members;
  if (typeof data.status === "string") allowed.status = data.status as GroupStatus;
  allowed.updated_by = effectiveUserId;

  const { data: updatedRows, error: updErr } = await supabase
    .from("groups")
    .update(allowed)
    .eq("id", groupId)
    .select("*")
    .limit(1);
  if (updErr) return errors.internal("Failed to update group");
  const updated = updatedRows?.[0];
  if (!updated) return errors.internal("Failed to update group (empty)");
  return { data: mapGroupRowToDTO(updated) };
}

/** Rotate group invite code. Admin only. Optionally reuse keeps same code if exists (not used in MVP). */
export async function rotateGroupInvite(
  supabase: SupabaseClient,
  userId: string | undefined,
  groupId: UUID
): Promise<ApiResponse<GroupDTO>> {
  const effectiveUserId = userId || DEFAULT_USER_ID;
  // Verify admin membership
  const { data: row, error } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  if (error) return errors.internal("Failed to fetch group");
  if (!row) return errors.notFound("Group");
  const { data: permRow, error: roleErr } = await supabase
    .from("group_memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", effectiveUserId)
    .maybeSingle();
  if (roleErr) return errors.internal("Failed to verify role");
  if (!permRow || permRow.role !== "admin") return errors.forbiddenRole();

  // Generate new code
  const code = generateInviteCode();
  const { data: updatedRows, error: updErr } = await supabase
    .from("groups")
    .update({ invite_code: code, invite_current_uses: 0, updated_by: effectiveUserId })
    .eq("id", groupId)
    .select("*")
    .limit(1);
  if (updErr) {
    console.error("[rotateGroupInvite] Supabase error:", updErr);
    return errors.internal(`Failed to rotate invite: ${updErr.message || JSON.stringify(updErr)}`);
  }
  const updated = updatedRows?.[0];
  if (!updated) return errors.internal("Failed to rotate invite (empty)");
  return { data: mapGroupRowToDTO(updated) };
}

function generateInviteCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // avoid ambiguous chars (i, l, o, 0, 1) - lowercase to match DB constraint
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
