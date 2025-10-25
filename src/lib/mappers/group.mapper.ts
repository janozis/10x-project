import type { GroupDTO } from "../../types";
import type { Tables } from "../../db/database.types";

// Mapper from raw DB row (groups) to GroupDTO
export function mapGroupRowToDTO(row: Tables<"groups">): GroupDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lore_theme: row.lore_theme,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    invite: row.invite_code
      ? {
          code: row.invite_code,
          expires_at: row.invite_expires_at,
          max_uses: row.invite_max_uses,
          current_uses: row.invite_current_uses,
        }
      : null,
    max_members: row.max_members,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}
