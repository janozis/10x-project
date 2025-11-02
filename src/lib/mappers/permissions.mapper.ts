import type { UserGroupPermissionsEntity, GroupPermissionsDTO, UUID } from "../../types";

/**
 * Maps user_group_permissions view row to GroupPermissionsDTO.
 *
 * The view aggregates user's role and computed permission flags
 * (can_edit_all, can_edit_assigned_only) based on group membership.
 */
export function mapPermissionsRowToDTO(row: UserGroupPermissionsEntity): GroupPermissionsDTO {
  return {
    group_id: row.group_id as UUID,
    role: row.role as "admin" | "editor" | "member",
    can_edit_all: row.can_edit_all ?? false,
    can_edit_assigned_only: row.can_edit_assigned_only ?? false,
  };
}
