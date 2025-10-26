import type { GroupMemberDTO, GroupRole } from "../../types";
import type { Tables } from "../../db/database.types";

// Mapper from raw DB row (group_memberships) to GroupMemberDTO
export function mapMembershipRowToDTO(row: Tables<"group_memberships">): GroupMemberDTO {
  return {
    user_id: row.user_id,
    role: row.role as GroupRole,
    joined_at: row.joined_at,
    group_id: row.group_id,
  };
}
