import type { Tables } from "../../db/database.types";
import type { CampDayDTO } from "../../types";

// Map a raw camp_days table row to CampDayDTO.
// Kept minimal; any future computed fields can be added here.
export function mapCampDayRowToDTO(row: Tables<"camp_days">): CampDayDTO {
  return {
    id: row.id,
    group_id: row.group_id,
    day_number: row.day_number,
    date: row.date,
    theme: row.theme,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
