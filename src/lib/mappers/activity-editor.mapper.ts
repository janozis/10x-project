import type { Tables } from "../../db/database.types";
import type { ActivityEditorDTO } from "../../types";

/**
 * Maps a raw `activity_editors` table row to ActivityEditorDTO.
 * 1:1 column mapping, no transformations.
 */
export function toActivityEditorDTO(row: Tables<"activity_editors">): ActivityEditorDTO {
  return {
    activity_id: row.activity_id,
    user_id: row.user_id,
    assigned_at: row.assigned_at,
    assigned_by_user_id: row.assigned_by_user_id,
  };
}
