import type { SupabaseClient } from "../../db/supabase.client";
import type { GroupPermissionsDTO, ApiResponse, UUID } from "../../types";
import { errors } from "../errors";
import { mapPermissionsRowToDTO } from "../mappers/permissions.mapper";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function effectiveUserId(userId: UUID | undefined): UUID {
  return userId || (DEFAULT_USER_ID as UUID);
}

/**
 * Get user's effective permissions within a group.
 *
 * Queries the user_group_permissions view which aggregates:
 * - User's role in the group (admin|editor|member)
 * - Computed permission flags based on role
 *
 * Authorization: User must be a member of the group.
 * Returns 404 if not a member (security by obscurity - don't reveal group existence).
 *
 * @param supabase - Supabase client from context.locals
 * @param groupId - Group UUID from path parameter
 * @param userId - Authenticated user ID (or undefined for dev fallback)
 * @returns ApiResponse with GroupPermissionsDTO or ApiError
 *
 * @example
 * const result = await getGroupPermissions(supabase, groupId, userId);
 * if ("error" in result) {
 *   // Handle error
 * } else {
 *   // result.data contains GroupPermissionsDTO
 * }
 */
export async function getGroupPermissions(
  supabase: SupabaseClient,
  groupId: string,
  userId: UUID | undefined
): Promise<ApiResponse<GroupPermissionsDTO>> {
  const actorUserId = effectiveUserId(userId);

  // 1. Validate group_id format
  if (!isValidUUID(groupId)) {
    return errors.validation({ group_id: "invalid uuid" });
  }

  // 2. Query user_group_permissions view
  const { data, error } = await supabase
    .from("user_group_permissions")
    .select("*")
    .eq("user_id", actorUserId)
    .eq("group_id", groupId)
    .maybeSingle();

  // 3. Handle database error
  if (error) {
    console.error(`[DB Error] Failed to fetch permissions for user ${actorUserId} in group ${groupId}:`, error);
    return errors.internal("Failed to fetch permissions");
  }

  // 4. Handle not found (not a member)
  if (!data) {
    // Security: don't reveal whether group exists
    // Returns 404 instead of 403 to prevent enumeration
    return errors.notFound("Group");
  }

  // 5. Map to DTO
  const dto = mapPermissionsRowToDTO(data);
  return { data: dto };
}
