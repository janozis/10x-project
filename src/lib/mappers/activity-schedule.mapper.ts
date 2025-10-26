import type { Tables } from "../../db/database.types";
import type { ActivityScheduleDTO } from "../../types";

// Map raw activity_schedules table row to ActivityScheduleDTO.
// Future: computed fields (e.g., duration) can be added here without changing DTO contract.
export function mapActivityScheduleRowToDTO(row: Tables<"activity_schedules">): ActivityScheduleDTO {
  return {
    id: row.id,
    activity_id: row.activity_id,
    camp_day_id: row.camp_day_id,
    start_time: row.start_time,
    end_time: row.end_time,
    order_in_day: row.order_in_day,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
