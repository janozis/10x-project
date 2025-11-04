import { describe, it, expect } from 'vitest';
import { mapDashboardToTilesVM } from './dashboard-tiles.mapper';
import type { GroupDashboardDTO, GroupPermissionsDTO } from '@/types';

// We need to test the clamp01 function indirectly through mapDashboardToTilesVM
// since it's not exported. We'll test it via pct_evaluated_above_7 values.

describe('dashboard-tiles.mapper', () => {
  describe('clamp01 (tested indirectly via mapDashboardToTilesVM)', () => {
    const baseMockDTO: GroupDashboardDTO = {
      group_id: '123e4567-e89b-12d3-a456-426614174000',
      total_activities: 10,
      evaluated_activities: 8,
      pct_evaluated_above_7: 0.5,
      tasks: { pending: 5, done: 10 },
      recent_activity: [],
    };

    it('should clamp negative values to 0 (0%)', () => {
      // Arrange
      const dto: GroupDashboardDTO = {
        ...baseMockDTO,
        pct_evaluated_above_7: -0.5, // Invalid negative value
      };

      // Act
      const result = mapDashboardToTilesVM(dto);

      // Assert
      expect(result.pctEvaluatedAbove7).toBe(0); // Clamped to 0, then * 100 = 0%
    });

    it('should clamp values > 1 to 1 (100%)', () => {
      // Arrange
      const dto: GroupDashboardDTO = {
        ...baseMockDTO,
        pct_evaluated_above_7: 1.5, // Invalid value > 1
      };

      // Act
      const result = mapDashboardToTilesVM(dto);

      // Assert
      expect(result.pctEvaluatedAbove7).toBe(100); // Clamped to 1, then * 100 = 100%
    });

    it('should preserve values in range [0,1] and convert to percentage', () => {
      // Arrange
      const testCases = [
        { input: 0, expected: 0 },
        { input: 0.25, expected: 25 },
        { input: 0.5, expected: 50 },
        { input: 0.75, expected: 75 },
        { input: 1, expected: 100 },
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        const dto: GroupDashboardDTO = {
          ...baseMockDTO,
          pct_evaluated_above_7: input,
        };
        const result = mapDashboardToTilesVM(dto);

        // Assert
        expect(result.pctEvaluatedAbove7).toBe(expected);
      });
    });

    it('should handle NaN values by clamping to 0', () => {
      // Arrange
      const dto: GroupDashboardDTO = {
        ...baseMockDTO,
        pct_evaluated_above_7: NaN,
      };

      // Act
      const result = mapDashboardToTilesVM(dto);

      // Assert
      expect(result.pctEvaluatedAbove7).toBe(0); // NaN -> 0 via clamp01
    });
  });

  describe('mapDashboardToTilesVM', () => {
    const baseMockDTO: GroupDashboardDTO = {
      group_id: '123e4567-e89b-12d3-a456-426614174000',
      total_activities: 10,
      evaluated_activities: 8,
      pct_evaluated_above_7: 0.75,
      tasks: { pending: 5, done: 10 },
      recent_activity: [],
    };

    it('should set canCreateTasks to true when user is admin', () => {
      // Arrange
      const permissions: GroupPermissionsDTO = {
        role: 'admin',
        can_manage_group: true,
        can_create_activities: true,
        can_manage_tasks: true,
        can_manage_camp_days: true,
      };

      // Act
      const result = mapDashboardToTilesVM(baseMockDTO, permissions);

      // Assert
      expect(result.canCreateTasks).toBe(true);
    });

    it('should set canCreateTasks to false when user is not admin', () => {
      // Arrange
      const editorPermissions: GroupPermissionsDTO = {
        role: 'editor',
        can_manage_group: false,
        can_create_activities: true,
        can_manage_tasks: false,
        can_manage_camp_days: false,
      };

      const memberPermissions: GroupPermissionsDTO = {
        role: 'member',
        can_manage_group: false,
        can_create_activities: false,
        can_manage_tasks: false,
        can_manage_camp_days: false,
      };

      // Act
      const editorResult = mapDashboardToTilesVM(baseMockDTO, editorPermissions);
      const memberResult = mapDashboardToTilesVM(baseMockDTO, memberPermissions);

      // Assert
      expect(editorResult.canCreateTasks).toBe(false);
      expect(memberResult.canCreateTasks).toBe(false);
    });

    it('should set canCreateTasks to false when permissions are undefined', () => {
      // Arrange - no permissions provided

      // Act
      const result = mapDashboardToTilesVM(baseMockDTO, undefined);

      // Assert
      expect(result.canCreateTasks).toBe(false);
    });
  });
});

