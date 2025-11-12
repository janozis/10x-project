import { describe, it, expect } from "vitest";
import { mapActivityRow } from "./activity.mapper";
import type { Tables } from "@/db/database.types";

describe("activity.mapper", () => {
  describe("mapActivityRow", () => {
    // Mock data for testing
    const mockActivityRow: Tables<"activities"> = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      group_id: "223e4567-e89b-12d3-a456-426614174000",
      title: "Test Activity",
      objective: "Test objective",
      tasks: "Task 1\nTask 2",
      duration_minutes: 60,
      location: "Test location",
      materials: "Materials needed",
      responsible: "Team leader",
      knowledge_scope: "Basic knowledge",
      participants: "All team members",
      flow: "Activity flow description",
      summary: "Activity summary",
      status: "draft",
      last_evaluation_requested_at: null,
      deleted_at: null,
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z",
    };

    const mockEditors: Tables<"activity_editors">[] = [
      {
        activity_id: "123e4567-e89b-12d3-a456-426614174000",
        user_id: "323e4567-e89b-12d3-a456-426614174000",
        assigned_at: "2024-01-15T11:00:00.000Z",
        assigned_by_user_id: "423e4567-e89b-12d3-a456-426614174000",
        deleted_at: null,
      },
      {
        activity_id: "123e4567-e89b-12d3-a456-426614174000",
        user_id: "523e4567-e89b-12d3-a456-426614174000",
        assigned_at: "2024-01-15T12:00:00.000Z",
        assigned_by_user_id: "423e4567-e89b-12d3-a456-426614174000",
        deleted_at: null,
      },
    ];

    const mockAIEvaluation = {
      lore_score: 8,
      scouting_values_score: 7,
      version: 1,
      created_at: "2024-01-15T14:00:00.000Z",
    };

    it("should correctly map all activity fields with editors and AI evaluation", () => {
      // Arrange
      const row = mockActivityRow;
      const editors = mockEditors;
      const aiEvaluation = mockAIEvaluation;

      // Act
      const result = mapActivityRow(row, editors, aiEvaluation);

      // Assert - Activity fields
      expect(result.id).toBe(row.id);
      expect(result.group_id).toBe(row.group_id);
      expect(result.title).toBe(row.title);
      expect(result.objective).toBe(row.objective);
      expect(result.tasks).toBe(row.tasks);
      expect(result.duration_minutes).toBe(row.duration_minutes);
      expect(result.location).toBe(row.location);
      expect(result.materials).toBe(row.materials);
      expect(result.responsible).toBe(row.responsible);
      expect(result.knowledge_scope).toBe(row.knowledge_scope);
      expect(result.participants).toBe(row.participants);
      expect(result.flow).toBe(row.flow);
      expect(result.summary).toBe(row.summary);
      expect(result.status).toBe(row.status);
      expect(result.last_evaluation_requested_at).toBe(row.last_evaluation_requested_at);
      expect(result.deleted_at).toBe(row.deleted_at);
      expect(result.created_at).toBe(row.created_at);
      expect(result.updated_at).toBe(row.updated_at);

      // Assert - Editors
      expect(result.editors).toHaveLength(2);
      expect(result.editors[0].activity_id).toBe(editors[0].activity_id);
      expect(result.editors[0].user_id).toBe(editors[0].user_id);
      expect(result.editors[0].assigned_at).toBe(editors[0].assigned_at);
      expect(result.editors[0].assigned_by_user_id).toBe(editors[0].assigned_by_user_id);

      // Assert - AI Evaluation
      expect(result.latest_ai_evaluation).not.toBeNull();
      expect(result.latest_ai_evaluation?.lore_score).toBe(aiEvaluation.lore_score);
      expect(result.latest_ai_evaluation?.scouting_values_score).toBe(aiEvaluation.scouting_values_score);
      expect(result.latest_ai_evaluation?.version).toBe(aiEvaluation.version);
      expect(result.latest_ai_evaluation?.created_at).toBe(aiEvaluation.created_at);
    });

    it("should handle empty editors array", () => {
      // Arrange
      const row = mockActivityRow;
      const editors: Tables<"activity_editors">[] = [];

      // Act
      const result = mapActivityRow(row, editors, null);

      // Assert
      expect(result.editors).toEqual([]);
      expect(result.editors).toHaveLength(0);
    });

    it("should handle null AI evaluation", () => {
      // Arrange
      const row = mockActivityRow;
      const editors = mockEditors;

      // Act
      const result = mapActivityRow(row, editors, null);

      // Assert
      expect(result.latest_ai_evaluation).toBeNull();
    });
  });
});
