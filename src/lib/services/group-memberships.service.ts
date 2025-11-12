import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type { ApiListResponse, ApiResponse, GroupMemberDTO } from "../../types";
import { errors } from "../errors";
import { membershipRoleChangeSchema, type MembershipRoleChangeInput } from "../validation/groupMembership";
import type { Tables } from "../../db/database.types";
import { mapMembershipRowToDTO } from "../mappers/group-membership.mapper";

// Simple UUID v4 format check (leniency acceptable for early validation)
const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Internal helper: fetch membership row and expose raw DB error separately.
 * This lets us differentiate between "not found" and "query failed" for diagnostics.
 */
async function fetchMembership(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<{ row: Tables<"group_memberships"> | null; dbError: any | null }> {
  const { data, error } = await supabase
    .from("group_memberships")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .limit(1);
  if (error) return { row: null, dbError: error };
  return { row: data && data.length > 0 ? data[0] : null, dbError: null };
}

async function fetchCallerMembership(
  supabase: SupabaseClient,
  groupId: string,
  authUserId: string
): Promise<{ row: Tables<"group_memberships"> | null; dbError: any | null }> {
  return fetchMembership(supabase, groupId, authUserId);
}

// Detect trigger / DB constraint error for last admin removal
function isLastAdminRemovalError(message: string | undefined): boolean {
  if (!message) return false;
  return /group must have at least one admin/i.test(message);
}

/**
 * Attach diagnostics info (only in dev) to an error response object.
 */
function withDiagnostics<T extends { error?: any }>(base: T, diagnostics: Record<string, unknown>): T {
  if (import.meta.env.DEV) {
    (base as any).diagnostics = diagnostics;
  }
  return base;
}

/**
 * List all members of a group. Caller must be a member (any role) otherwise group is masked as NOT_FOUND.
 * Validation: groupId UUID format.
 * Returns ApiListResponse with count.
 * Adds diagnostics in dev:
 *  - groupExists: boolean
 *  - callerMembershipFetchError: string | null
 *  - reason: 'caller_not_member' | 'group_missing' | 'db_error'
 */
export async function listMembers(
  supabase: SupabaseClient,
  authUserId: string | undefined,
  groupId: string
): Promise<ApiListResponse<GroupMemberDTO>> {
  const effectiveUserId = authUserId || DEFAULT_USER_ID;
  console.log("[listMembers] CURRENT_USER_ID:", effectiveUserId);
  console.log("[listMembers] GROUP_ID:", groupId);

  if (!isUUID(groupId)) {
    return errors.validation({ group_id: "invalid uuid" }) as ApiListResponse<GroupMemberDTO>;
  }

  // First verify the caller is a member of the group (for better error messages)
  const { row: caller, dbError: callerErr } = await fetchCallerMembership(supabase, groupId, effectiveUserId);
  console.log("[listMembers] Caller membership check:", { hasMembership: !!caller, error: callerErr?.message });

  if (!caller) {
    // Determine if group exists (for diagnostics only)
    let groupExists = false;
    let groupQueryError: any | null = null;
    if (!callerErr) {
      const { data: gRows, error: gError } = await supabase.from("groups").select("id").eq("id", groupId).limit(1);
      if (gError) {
        groupQueryError = gError;
      } else {
        groupExists = !!(gRows && gRows.length > 0);
      }
    }
    const reason = callerErr ? "db_error" : groupExists ? "caller_not_member" : "group_missing";
    const notFound = errors.notFound("Group") as ApiListResponse<GroupMemberDTO>;
    return withDiagnostics(notFound, {
      groupExists,
      callerMembershipFetchError: callerErr ? callerErr.message : null,
      groupQueryError: groupQueryError ? groupQueryError.message : null,
      reason,
    });
  }

  // Use the database function to get members with emails
  // This function already checks membership and returns emails via security definer
  console.log("[listMembers] Calling RPC get_group_members_with_emails");
  const { data: rows, error } = await supabase.rpc("get_group_members_with_emails", {
    p_group_id: groupId,
  });

  console.log("[listMembers] RPC result:", {
    hasData: !!rows,
    dataLength: rows?.length,
    hasError: !!error,
    errorMessage: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details,
    errorHint: error?.hint,
  });

  // Log raw data from RPC
  if (rows && rows.length > 0) {
    console.log("[listMembers] Raw RPC data sample:", rows[0]);
  }

  if (error) {
    // Check if error is due to authorization (not a member)
    if (error.message?.includes("Not authorized") || error.message?.includes("permission denied")) {
      const notFound = errors.notFound("Group") as ApiListResponse<GroupMemberDTO>;
      return withDiagnostics(notFound, {
        reason: "rpc_authorization_failed",
        rpcError: error.message,
        rpcCode: error.code,
      });
    }
    return withDiagnostics(errors.internal("Failed to list members") as ApiListResponse<GroupMemberDTO>, {
      listError: error.message,
      errorCode: error.code,
      errorDetails: error.details,
    });
  }

  const dtos = (rows ?? []).map((row) => mapMembershipRowToDTO(row as any));
  console.log("[listMembers] Mapped DTOs:", { count: dtos.length, emails: dtos.map((d) => d.user_email) });
  return { data: dtos, count: dtos.length };
}

/**
 * Change role of target member. Requires caller to be admin. Idempotent if role unchanged.
 * Adds diagnostics (dev) for membership fetch errors.
 */
export async function changeMemberRole(
  supabase: SupabaseClient,
  authUserId: string | undefined,
  groupId: string,
  targetUserId: string,
  input: unknown
): Promise<ApiResponse<GroupMemberDTO>> {
  const effectiveUserId = authUserId || DEFAULT_USER_ID;

  if (!isUUID(groupId) || !isUUID(targetUserId)) {
    const details: Record<string, string> = {};
    if (!isUUID(groupId)) details.group_id = "invalid uuid";
    if (!isUUID(targetUserId)) details.user_id = "invalid uuid";
    return errors.validation(details);
  }

  const parsed = membershipRoleChangeSchema.safeParse(input);
  if (!parsed.success) {
    return errors.roleInvalid();
  }
  const data: MembershipRoleChangeInput = parsed.data;

  const { row: caller, dbError: callerErr } = await fetchCallerMembership(supabase, groupId, effectiveUserId);
  if (!caller) {
    return withDiagnostics(errors.notFound("Group"), {
      callerMembershipFetchError: callerErr ? callerErr.message : null,
    });
  }
  if (caller.role !== "admin") return errors.forbiddenRole();

  const { row: membership, dbError: membershipErr } = await fetchMembership(supabase, groupId, targetUserId);
  if (!membership) {
    return withDiagnostics(errors.notFound("Member"), {
      targetMembershipFetchError: membershipErr ? membershipErr.message : null,
    });
  }

  if (membership.role === data.role) {
    return { data: mapMembershipRowToDTO(membership) };
  }

  const { data: updated, error } = await supabase
    .from("group_memberships")
    .update({ role: data.role })
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .select();
  if (error) {
    if (isLastAdminRemovalError(error.message)) return errors.lastAdminRemoval();
    return withDiagnostics(errors.internal("Failed to update role"), {
      updateError: error.message,
    });
  }
  if (!updated || updated.length === 0) {
    return errors.internal("Role update returned empty result");
  }
  return { data: mapMembershipRowToDTO(updated[0]) };
}

/**
 * Remove a member from a group. Allowed if caller is admin or self-removal.
 * Adds diagnostics for membership fetch issues.
 */
export async function removeMember(
  supabase: SupabaseClient,
  authUserId: string | undefined,
  groupId: string,
  targetUserId: string
): Promise<ApiResponse<GroupMemberDTO>> {
  const effectiveUserId = authUserId || DEFAULT_USER_ID;
  if (!isUUID(groupId) || !isUUID(targetUserId)) {
    const details: Record<string, string> = {};
    if (!isUUID(groupId)) details.group_id = "invalid uuid";
    if (!isUUID(targetUserId)) details.user_id = "invalid uuid";
    return errors.validation(details);
  }

  const { row: caller, dbError: callerErr } = await fetchCallerMembership(supabase, groupId, effectiveUserId);
  if (!caller) {
    return withDiagnostics(errors.notFound("Group"), {
      callerMembershipFetchError: callerErr ? callerErr.message : null,
    });
  }

  const { row: membership, dbError: membershipErr } = await fetchMembership(supabase, groupId, targetUserId);
  if (!membership) {
    return withDiagnostics(errors.notFound("Member"), {
      targetMembershipFetchError: membershipErr ? membershipErr.message : null,
    });
  }

  const isSelf = effectiveUserId === targetUserId;
  if (!isSelf && caller.role !== "admin") return errors.forbiddenRole();

  const { data: deletedRows, error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .select();
  if (error) {
    if (isLastAdminRemovalError(error.message)) return errors.lastAdminRemoval();
    return withDiagnostics(errors.internal("Failed to remove member"), {
      deleteError: error.message,
    });
  }
  if (!deletedRows || deletedRows.length === 0) {
    return errors.internal("Delete returned empty result");
  }
  return { data: mapMembershipRowToDTO(deletedRows[0]) };
}

/**
 * Promote member to admin role. Requires caller admin. Idempotent if already admin.
 * Adds diagnostics for membership fetch issues.
 */
export async function promoteMemberAdmin(
  supabase: SupabaseClient,
  authUserId: string | undefined,
  groupId: string,
  targetUserId: string
): Promise<ApiResponse<GroupMemberDTO>> {
  const effectiveUserId = authUserId || DEFAULT_USER_ID;
  if (!isUUID(groupId) || !isUUID(targetUserId)) {
    const details: Record<string, string> = {};
    if (!isUUID(groupId)) details.group_id = "invalid uuid";
    if (!isUUID(targetUserId)) details.user_id = "invalid uuid";
    return errors.validation(details);
  }

  const { row: caller, dbError: callerErr } = await fetchCallerMembership(supabase, groupId, effectiveUserId);
  if (!caller) {
    return withDiagnostics(errors.notFound("Group"), {
      callerMembershipFetchError: callerErr ? callerErr.message : null,
    });
  }
  if (caller.role !== "admin") return errors.forbiddenRole();

  const { row: membership, dbError: membershipErr } = await fetchMembership(supabase, groupId, targetUserId);
  if (!membership) {
    return withDiagnostics(errors.notFound("Member"), {
      targetMembershipFetchError: membershipErr ? membershipErr.message : null,
    });
  }

  if (membership.role === "admin") {
    return { data: mapMembershipRowToDTO(membership) };
  }

  const { data: updated, error } = await supabase
    .from("group_memberships")
    .update({ role: "admin" })
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .select();
  if (error) {
    if (isLastAdminRemovalError(error.message)) return errors.lastAdminRemoval();
    return withDiagnostics(errors.internal("Failed to promote member"), {
      promoteError: error.message,
    });
  }
  if (!updated || updated.length === 0) {
    return errors.internal("Promote returned empty result");
  }
  return { data: mapMembershipRowToDTO(updated[0]) };
}
