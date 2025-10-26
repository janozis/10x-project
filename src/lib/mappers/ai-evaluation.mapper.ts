import type { Tables } from "../../db/database.types";
import type { AIEvaluationDTO } from "../../types";

// Converts a raw ai_evaluations row to AIEvaluationDTO ensuring suggestions is an array of strings.
export function mapAIEvaluationRow(row: Tables<"ai_evaluations">): AIEvaluationDTO {
  let suggestions: string[] = [];
  const raw = row.suggestions as unknown;
  if (Array.isArray(raw)) {
    suggestions = raw.filter((v) => typeof v === "string");
  }
  return {
    id: row.id,
    activity_id: row.activity_id,
    version: row.version,
    lore_score: row.lore_score,
    scouting_values_score: row.scouting_values_score,
    lore_feedback: row.lore_feedback,
    scouting_feedback: row.scouting_feedback,
    tokens: row.tokens,
    created_at: row.created_at,
    suggestions,
  };
}
