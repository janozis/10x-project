import { describe, it, expect } from "vitest";
import { groupCreateSchema } from "./group";

describe("group validation", () => {
  describe("groupCreateSchema", () => {
    const validGroupData = {
      name: "Test Group",
      description: "A test group for validation",
      lore_theme: "Medieval adventure",
      start_date: "2024-06-01",
      end_date: "2024-06-15",
      max_members: 30,
    };

    it("should accept valid group data with end_date >= start_date", () => {
      // Arrange
      const data = validGroupData;

      // Act
      const result = groupCreateSchema.safeParse(data);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test Group");
        expect(result.data.start_date).toBe("2024-06-01");
        expect(result.data.end_date).toBe("2024-06-15");
      }
    });

    it("should reject when end_date is before start_date", () => {
      // Arrange
      const data = {
        ...validGroupData,
        start_date: "2024-06-15",
        end_date: "2024-06-01", // Before start_date
      };

      // Act
      const result = groupCreateSchema.safeParse(data);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const endDateError = result.error.issues.find((issue) => issue.path[0] === "end_date");
        expect(endDateError).toBeDefined();
        expect(endDateError?.message).toContain("end_date must be >= start_date");
      }
    });

    it("should validate max_members boundaries (1, 500 valid; 0, 501 invalid)", () => {
      // Arrange - Valid boundaries
      const validMin = { ...validGroupData, max_members: 1 };
      const validMax = { ...validGroupData, max_members: 500 };

      // Invalid boundaries
      const invalidMin = { ...validGroupData, max_members: 0 };
      const invalidMax = { ...validGroupData, max_members: 501 };

      // Act
      const resultValidMin = groupCreateSchema.safeParse(validMin);
      const resultValidMax = groupCreateSchema.safeParse(validMax);
      const resultInvalidMin = groupCreateSchema.safeParse(invalidMin);
      const resultInvalidMax = groupCreateSchema.safeParse(invalidMax);

      // Assert - Valid cases
      expect(resultValidMin.success).toBe(true);
      expect(resultValidMax.success).toBe(true);

      // Assert - Invalid cases
      expect(resultInvalidMin.success).toBe(false);
      expect(resultInvalidMax.success).toBe(false);

      if (!resultInvalidMin.success) {
        const error = resultInvalidMin.error.issues.find((issue) => issue.path[0] === "max_members");
        expect(error).toBeDefined();
      }

      if (!resultInvalidMax.success) {
        const error = resultInvalidMax.error.issues.find((issue) => issue.path[0] === "max_members");
        expect(error).toBeDefined();
      }
    });

    it("should reject invalid date format (not YYYY-MM-DD)", () => {
      // Arrange - Various invalid date formats
      const invalidFormats = [
        { ...validGroupData, start_date: "2024/06/01" }, // wrong separator
        { ...validGroupData, start_date: "01-06-2024" }, // wrong order
        { ...validGroupData, start_date: "2024-6-1" }, // missing zeros
        { ...validGroupData, end_date: "24-06-01" }, // short year
        { ...validGroupData, end_date: "not-a-date" }, // invalid string
      ];

      invalidFormats.forEach((data) => {
        // Act
        const result = groupCreateSchema.safeParse(data);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    it("should reject empty strings after trim for required fields", () => {
      // Arrange - Test empty/whitespace-only strings
      const emptyName = { ...validGroupData, name: "   " };
      const emptyDescription = { ...validGroupData, description: "" };
      const emptyLoreTheme = { ...validGroupData, lore_theme: "  \t  " };

      // Act
      const resultName = groupCreateSchema.safeParse(emptyName);
      const resultDescription = groupCreateSchema.safeParse(emptyDescription);
      const resultLoreTheme = groupCreateSchema.safeParse(emptyLoreTheme);

      // Assert - All should fail
      expect(resultName.success).toBe(false);
      expect(resultDescription.success).toBe(false);
      expect(resultLoreTheme.success).toBe(false);

      // Check error messages
      if (!resultName.success) {
        const error = resultName.error.issues.find((issue) => issue.path[0] === "name");
        expect(error?.message).toContain("name required");
      }
    });

    it("should validate string length boundaries", () => {
      // Arrange
      const name201chars = "a".repeat(201);
      const description2001chars = "a".repeat(2001);
      const loreTheme201chars = "a".repeat(201);

      const tooLongName = { ...validGroupData, name: name201chars };
      const tooLongDescription = { ...validGroupData, description: description2001chars };
      const tooLongLoreTheme = { ...validGroupData, lore_theme: loreTheme201chars };

      // Valid max lengths
      const validName = { ...validGroupData, name: "a".repeat(200) };
      const validDescription = { ...validGroupData, description: "a".repeat(2000) };
      const validLoreTheme = { ...validGroupData, lore_theme: "a".repeat(200) };

      // Act - Invalid cases
      const resultName = groupCreateSchema.safeParse(tooLongName);
      const resultDescription = groupCreateSchema.safeParse(tooLongDescription);
      const resultLoreTheme = groupCreateSchema.safeParse(tooLongLoreTheme);

      // Act - Valid max length cases
      const resultValidName = groupCreateSchema.safeParse(validName);
      const resultValidDescription = groupCreateSchema.safeParse(validDescription);
      const resultValidLoreTheme = groupCreateSchema.safeParse(validLoreTheme);

      // Assert - Too long should fail
      expect(resultName.success).toBe(false);
      expect(resultDescription.success).toBe(false);
      expect(resultLoreTheme.success).toBe(false);

      // Assert - Max length should succeed
      expect(resultValidName.success).toBe(true);
      expect(resultValidDescription.success).toBe(true);
      expect(resultValidLoreTheme.success).toBe(true);
    });
  });
});
