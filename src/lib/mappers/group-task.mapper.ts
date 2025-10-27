import type { Tables } from "../../db/database.types";
import type { GroupTaskDTO } from "../../types";

// Map raw DB group_tasks row to GroupTaskDTO.
// No nested structures; activity_id is optional (nullable).
export function mapGroupTaskRow(row: Tables<"group_tasks">): GroupTaskDTO {
  return {
    id: row.id,
    group_id: row.group_id,
    activity_id: row.activity_id,
    title: row.title,
    description: row.description,
    due_date: row.due_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
