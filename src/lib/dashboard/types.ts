import type { UUID, TimestampISO, DateISO } from "@/types";

// ViewModel for dashboard tiles derived from GroupDashboardDTO
export interface DashboardTilesVM {
  groupId: UUID;
  totalActivities: number;
  evaluatedActivities: number;
  pctEvaluatedAbove7: number; // 0..100 (rounded integer)
  tasksPending: number;
  tasksDone: number;
  canCreateTasks: boolean;
}

// Activity/Event types for the Recent Activity feed (future use)
export type ActivityEventType =
  | "activity_created"
  | "activity_updated"
  | "task_created"
  | "task_updated"
  | "task_done"
  | "ai_evaluated"
  | "other";

export interface RecentActivityItemVM {
  id: UUID;
  type: ActivityEventType;
  title: string;
  at: TimestampISO;
  userId: UUID;
  icon: string;
  href?: string;
}

// Local state for QuickTaskForm (future use)
export interface QuickTaskFormState {
  title: string;
  description: string;
  dueDate?: DateISO;
  activityId?: UUID;
  isSubmitting: boolean;
  error?: string;
}


