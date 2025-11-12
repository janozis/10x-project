import { describe, it, expect } from "vitest";
import { mapDashboardStatsToDTO } from "./dashboard.mapper";
import type { Tables } from "@/db/database.types";

describe("dashboard.mapper", () => {
  describe("mapDashboardStatsToDTO", () => {
    const mockStatsRow: Tables<"group_dashboard_stats"> = {
      group_id: "123e4567-e89b-12d3-a456-426614174000",
      total_activities: 10,
      evaluated_activities: 8,
      pct_evaluated_above_7: 0.75,
      tasks_pending: 5,
      tasks_done: 15,
    };

    it('should create "activity_created" events for all activities', () => {
      // Arrange
      const recentActivities = [
        {
          id: "act-1",
          group_id: "group-1",
          created_at: "2024-01-15T10:00:00.000Z",
          created_by: "user-1",
          updated_at: "2024-01-15T10:00:00.000Z",
          updated_by: "user-1",
        },
        {
          id: "act-2",
          group_id: "group-1",
          created_at: "2024-01-15T11:00:00.000Z",
          created_by: "user-2",
          updated_at: "2024-01-15T11:00:00.000Z",
          updated_by: "user-2",
        },
      ];

      // Act
      const result = mapDashboardStatsToDTO(mockStatsRow, recentActivities);

      // Assert
      const createdEvents = result.recent_activity.filter((e) => e.type === "activity_created");
      expect(createdEvents).toHaveLength(2);
      expect(createdEvents[0].id).toBe("act-2"); // DESC order (newer first)
      expect(createdEvents[0].at).toBe("2024-01-15T11:00:00.000Z");
      expect(createdEvents[0].user_id).toBe("user-2");
      expect(createdEvents[1].id).toBe("act-1");
    });

    it('should create "activity_updated" events only when updated_at differs from created_at', () => {
      // Arrange
      const recentActivities = [
        {
          id: "act-1",
          group_id: "group-1",
          created_at: "2024-01-15T10:00:00.000Z",
          created_by: "user-1",
          updated_at: "2024-01-15T10:00:00.000Z", // Same as created_at - no update event
          updated_by: "user-1",
        },
        {
          id: "act-2",
          group_id: "group-1",
          created_at: "2024-01-15T11:00:00.000Z",
          created_by: "user-2",
          updated_at: "2024-01-15T12:00:00.000Z", // Different - should create update event
          updated_by: "user-3",
        },
      ];

      // Act
      const result = mapDashboardStatsToDTO(mockStatsRow, recentActivities);

      // Assert
      const updatedEvents = result.recent_activity.filter((e) => e.type === "activity_updated");
      expect(updatedEvents).toHaveLength(1);
      expect(updatedEvents[0].id).toBe("act-2");
      expect(updatedEvents[0].at).toBe("2024-01-15T12:00:00.000Z");
      expect(updatedEvents[0].user_id).toBe("user-3");
    });

    it("should sort all events by timestamp DESC (newest first)", () => {
      // Arrange
      const recentActivities = [
        {
          id: "act-1",
          group_id: "group-1",
          created_at: "2024-01-15T10:00:00.000Z", // oldest
          created_by: "user-1",
          updated_at: "2024-01-15T14:00:00.000Z", // newest
          updated_by: "user-1",
        },
        {
          id: "act-2",
          group_id: "group-1",
          created_at: "2024-01-15T12:00:00.000Z", // middle
          created_by: "user-2",
          updated_at: "2024-01-15T12:00:00.000Z",
          updated_by: "user-2",
        },
      ];

      // Act
      const result = mapDashboardStatsToDTO(mockStatsRow, recentActivities);

      // Assert
      expect(result.recent_activity).toHaveLength(3); // 2 created + 1 updated
      // Expected order (DESC): act-1 updated (14:00), act-2 created (12:00), act-1 created (10:00)
      expect(result.recent_activity[0].type).toBe("activity_updated");
      expect(result.recent_activity[0].id).toBe("act-1");
      expect(result.recent_activity[0].at).toBe("2024-01-15T14:00:00.000Z");

      expect(result.recent_activity[1].type).toBe("activity_created");
      expect(result.recent_activity[1].id).toBe("act-2");
      expect(result.recent_activity[1].at).toBe("2024-01-15T12:00:00.000Z");

      expect(result.recent_activity[2].type).toBe("activity_created");
      expect(result.recent_activity[2].id).toBe("act-1");
      expect(result.recent_activity[2].at).toBe("2024-01-15T10:00:00.000Z");
    });

    it("should limit recent_activity to maximum 10 events", () => {
      // Arrange - Create 8 activities with updates = 16 events total
      const recentActivities = Array.from({ length: 8 }, (_, i) => ({
        id: `act-${i}`,
        group_id: "group-1",
        created_at: `2024-01-15T${String(10 + i).padStart(2, "0")}:00:00.000Z`,
        created_by: "user-1",
        updated_at: `2024-01-15T${String(10 + i).padStart(2, "0")}:30:00.000Z`, // 30 min later
        updated_by: "user-2",
      }));

      // Act
      const result = mapDashboardStatsToDTO(mockStatsRow, recentActivities);

      // Assert
      expect(result.recent_activity).toHaveLength(10); // Should be capped at 10
    });

    it("should handle empty activities list", () => {
      // Arrange
      const recentActivities: any[] = [];

      // Act
      const result = mapDashboardStatsToDTO(mockStatsRow, recentActivities);

      // Assert
      expect(result.recent_activity).toEqual([]);
      expect(result.recent_activity).toHaveLength(0);
      expect(result.group_id).toBe(mockStatsRow.group_id);
      expect(result.total_activities).toBe(10);
    });

    it("should handle null values in stats with default 0", () => {
      // Arrange
      const statsRowWithNulls: Tables<"group_dashboard_stats"> = {
        group_id: "123e4567-e89b-12d3-a456-426614174000",
        total_activities: null,
        evaluated_activities: null,
        pct_evaluated_above_7: null,
        tasks_pending: null,
        tasks_done: null,
      };

      const recentActivities = [
        {
          id: "act-1",
          group_id: "group-1",
          created_at: "2024-01-15T10:00:00.000Z",
          created_by: "user-1",
          updated_at: "2024-01-15T10:00:00.000Z",
          updated_by: "user-1",
        },
      ];

      // Act
      const result = mapDashboardStatsToDTO(statsRowWithNulls, recentActivities);

      // Assert - All nulls should default to 0
      expect(result.total_activities).toBe(0);
      expect(result.evaluated_activities).toBe(0);
      expect(result.pct_evaluated_above_7).toBe(0);
      expect(result.tasks.pending).toBe(0);
      expect(result.tasks.done).toBe(0);
    });
  });
});
