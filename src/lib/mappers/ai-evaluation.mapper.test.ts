import { describe, it, expect } from "vitest";
import { mapAIEvaluationRow } from "./ai-evaluation.mapper";
import type { Tables } from "@/db/database.types";

describe("ai-evaluation.mapper", () => {
  describe("mapAIEvaluationRow", () => {
    const baseMockRow: Tables<"ai_evaluations"> = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      activity_id: "223e4567-e89b-12d3-a456-426614174000",
      version: 1,
      lore_score: 8,
      scouting_values_score: 7,
      lore_feedback: "Good alignment with camp lore",
      scouting_feedback: "Reflects scouting values well",
      tokens: 1500,
      created_at: "2024-01-15T10:00:00.000Z",
      suggestions: ["Add more team activities", "Consider outdoor setting"],
    };

    it("should correctly map all fields with valid string array suggestions", () => {
      // Arrange
      const row = baseMockRow;

      // Act
      const result = mapAIEvaluationRow(row);

      // Assert - All fields
      expect(result.id).toBe(row.id);
      expect(result.activity_id).toBe(row.activity_id);
      expect(result.version).toBe(row.version);
      expect(result.lore_score).toBe(row.lore_score);
      expect(result.scouting_values_score).toBe(row.scouting_values_score);
      expect(result.lore_feedback).toBe(row.lore_feedback);
      expect(result.scouting_feedback).toBe(row.scouting_feedback);
      expect(result.tokens).toBe(row.tokens);
      expect(result.created_at).toBe(row.created_at);

      // Assert - Suggestions
      expect(result.suggestions).toEqual(["Add more team activities", "Consider outdoor setting"]);
      expect(result.suggestions).toHaveLength(2);
    });

    it("should filter out non-string values from suggestions array", () => {
      // Arrange
      const row: Tables<"ai_evaluations"> = {
        ...baseMockRow,
        suggestions: [
          "Valid string suggestion",
          123, // number - should be filtered
          "Another valid suggestion",
          null, // null - should be filtered
          true, // boolean - should be filtered
          { invalid: "object" }, // object - should be filtered
          "Last valid suggestion",
        ] as any,
      };

      // Act
      const result = mapAIEvaluationRow(row);

      // Assert - Only strings should remain
      expect(result.suggestions).toEqual([
        "Valid string suggestion",
        "Another valid suggestion",
        "Last valid suggestion",
      ]);
      expect(result.suggestions).toHaveLength(3);
    });

    it("should handle null, undefined, and non-array suggestions as empty array", () => {
      // Arrange - Test various invalid suggestions values
      const testCases = [
        { suggestions: null, description: "null" },
        { suggestions: undefined, description: "undefined" },
        { suggestions: "not an array", description: "string" },
        { suggestions: 123, description: "number" },
        { suggestions: { key: "value" }, description: "object" },
      ];

      testCases.forEach(({ suggestions }) => {
        // Act
        const row: Tables<"ai_evaluations"> = {
          ...baseMockRow,
          suggestions: suggestions as any,
        };
        const result = mapAIEvaluationRow(row);

        // Assert
        expect(result.suggestions).toEqual([]);
        expect(result.suggestions).toHaveLength(0);
      });
    });
  });
});
