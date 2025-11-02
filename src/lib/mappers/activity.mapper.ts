import type { Tables } from "../../db/database.types";
import type { ActivityEditorDTO, ActivityWithEditorsDTO, TimestampISO } from "../../types";

// Map raw DB activity row + related editor rows to ActivityWithEditorsDTO.
// Excludes deleted_at (soft delete) from editors output logic; caller decides visibility.
export function mapActivityRow(
  row: Tables<"activities">,
  editors: Tables<"activity_editors">[],
  latestAIEvaluation?: { lore_score: number; scouting_values_score: number; version: number; created_at: string } | null
): ActivityWithEditorsDTO {
  const editorDTOs: ActivityEditorDTO[] = editors.map((e) => ({
    activity_id: e.activity_id,
    user_id: e.user_id,
    assigned_at: e.assigned_at,
    assigned_by_user_id: e.assigned_by_user_id,
  }));

  return {
    id: row.id,
    group_id: row.group_id,
    title: row.title,
    objective: row.objective,
    tasks: row.tasks,
    duration_minutes: row.duration_minutes,
    location: row.location,
    materials: row.materials,
    responsible: row.responsible,
    knowledge_scope: row.knowledge_scope,
    participants: row.participants,
    flow: row.flow,
    summary: row.summary,
    status: row.status,
    last_evaluation_requested_at: row.last_evaluation_requested_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    editors: editorDTOs,
    latest_ai_evaluation: latestAIEvaluation ? {
      lore_score: latestAIEvaluation.lore_score,
      scouting_values_score: latestAIEvaluation.scouting_values_score,
      version: latestAIEvaluation.version,
      created_at: latestAIEvaluation.created_at as TimestampISO,
    } : null,
  };
}
