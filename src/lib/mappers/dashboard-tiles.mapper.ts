import type { GroupDashboardDTO, GroupPermissionsDTO } from "@/types";
import type { DashboardTilesVM } from "@/lib/dashboard/types";

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Maps GroupDashboardDTO + Permissions to DashboardTilesVM suitable for UI.
 * - Converts pct_evaluated_above_7 from 0..1 to integer percentage 0..100
 * - Propagates task counts
 * - Derives canCreateTasks from permissions (admin only for MVP)
 */
export function mapDashboardToTilesVM(
  dto: GroupDashboardDTO,
  permissions?: GroupPermissionsDTO
): DashboardTilesVM {
  const percentage = Math.round(clamp01(dto.pct_evaluated_above_7 ?? 0) * 100);
  const canCreateTasks = permissions?.role === "admin";
  return {
    groupId: dto.group_id,
    totalActivities: dto.total_activities ?? 0,
    evaluatedActivities: dto.evaluated_activities ?? 0,
    pctEvaluatedAbove7: percentage,
    tasksPending: dto.tasks?.pending ?? 0,
    tasksDone: dto.tasks?.done ?? 0,
    canCreateTasks: Boolean(canCreateTasks),
  };
}


