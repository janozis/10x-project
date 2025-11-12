import { describe, it, expect } from "vitest";
import { minutesBetween, isValidTimeString, addMinutes, mapScheduleToSlotVM } from "./types";
import type { ActivityScheduleDTO } from "@/types";

describe("camp-days/types - Time Calculations", () => {
  describe("minutesBetween", () => {
    it("should calculate minutes between times in the same hour", () => {
      // Arrange
      const start = "09:00" as const;
      const end = "09:30" as const;

      // Act
      const result = minutesBetween(start, end);

      // Assert
      expect(result).toBe(30);
    });

    it("should calculate minutes across multiple hours", () => {
      // Arrange
      const start = "09:45" as const;
      const end = "11:15" as const;

      // Act
      const result = minutesBetween(start, end);

      // Assert
      expect(result).toBe(90); // 1h 30min = 90 minutes
    });

    it("should return negative value when end is before start", () => {
      // Arrange
      const start = "14:30" as const;
      const end = "12:00" as const;

      // Act
      const result = minutesBetween(start, end);

      // Assert
      expect(result).toBe(-150); // -2h 30min = -150 minutes
    });

    it("should handle edge case: start of day (00:00)", () => {
      // Arrange
      const start = "00:00" as const;
      const end = "08:30" as const;

      // Act
      const result = minutesBetween(start, end);

      // Assert
      expect(result).toBe(510); // 8h 30min = 510 minutes
    });

    it("should handle edge case: end of day (23:59)", () => {
      // Arrange
      const start = "20:00" as const;
      const end = "23:59" as const;

      // Act
      const result = minutesBetween(start, end);

      // Assert
      expect(result).toBe(239); // 3h 59min = 239 minutes
    });

    it("should handle edge case: full day span", () => {
      // Arrange
      const start = "00:00" as const;
      const end = "23:59" as const;

      // Act
      const result = minutesBetween(start, end);

      // Assert
      expect(result).toBe(1439); // 23h 59min = 1439 minutes
    });
  });

  describe("isValidTimeString", () => {
    it("should validate correct time format at start of day", () => {
      // Arrange
      const time = "00:00";

      // Act
      const result = isValidTimeString(time);

      // Assert
      expect(result).toBe(true);
    });

    it("should validate correct time format at end of day", () => {
      // Arrange
      const time = "23:59";

      // Act
      const result = isValidTimeString(time);

      // Assert
      expect(result).toBe(true);
    });

    it("should validate correct time format with leading zeros", () => {
      // Arrange
      const time = "09:05";

      // Act
      const result = isValidTimeString(time);

      // Assert
      expect(result).toBe(true);
    });

    it("should reject invalid hour values above 23", () => {
      // Arrange & Act & Assert
      expect(isValidTimeString("24:00")).toBe(false);
      expect(isValidTimeString("25:00")).toBe(false);
      expect(isValidTimeString("99:30")).toBe(false);
    });

    it("should reject invalid minute values above 59", () => {
      // Arrange & Act & Assert
      expect(isValidTimeString("12:60")).toBe(false);
      expect(isValidTimeString("09:99")).toBe(false);
      expect(isValidTimeString("00:61")).toBe(false);
    });

    it("should reject invalid format strings", () => {
      // Arrange & Act & Assert
      expect(isValidTimeString("9:00")).toBe(false); // missing leading zero in hour
      expect(isValidTimeString("12:5")).toBe(false); // missing leading zero in minute
      expect(isValidTimeString("9:5")).toBe(false); // missing both leading zeros
      expect(isValidTimeString("abc")).toBe(false); // not a time string
      expect(isValidTimeString("12:00:00")).toBe(false); // includes seconds
      expect(isValidTimeString("")).toBe(false); // empty string
      expect(isValidTimeString("12-00")).toBe(false); // wrong separator
    });
  });

  describe("addMinutes", () => {
    it("should add minutes within the same hour", () => {
      // Arrange
      const time = "09:00" as const;
      const minutesToAdd = 30;

      // Act
      const result = addMinutes(time, minutesToAdd);

      // Assert
      expect(result).toBe("09:30");
    });

    it("should handle overflow into next hour", () => {
      // Arrange
      const time = "09:45" as const;
      const minutesToAdd = 30;

      // Act
      const result = addMinutes(time, minutesToAdd);

      // Assert
      expect(result).toBe("10:15");
    });

    it("should clamp at day boundary (23:59) when exceeding", () => {
      // Arrange
      const time = "23:30" as const;
      const minutesToAdd = 60;

      // Act
      const result = addMinutes(time, minutesToAdd);

      // Assert
      expect(result).toBe("23:59"); // Should not overflow to next day
    });

    it("should clamp at start of day (00:00) when subtracting beyond midnight", () => {
      // Arrange
      const time = "05:00" as const;
      const minutesToAdd = -400; // subtract 6h 40min

      // Act
      const result = addMinutes(time, minutesToAdd);

      // Assert
      expect(result).toBe("00:00"); // Should not go to previous day
    });

    it("should clamp at end of day when adding very large number of minutes", () => {
      // Arrange
      const time = "00:00" as const;
      const minutesToAdd = 2000; // 33h 20min - exceeds one day

      // Act
      const result = addMinutes(time, minutesToAdd);

      // Assert
      expect(result).toBe("23:59"); // Should clamp at day boundary
    });

    it("should return same time when adding zero minutes", () => {
      // Arrange
      const time = "12:30" as const;
      const minutesToAdd = 0;

      // Act
      const result = addMinutes(time, minutesToAdd);

      // Assert
      expect(result).toBe("12:30");
    });
  });
});
