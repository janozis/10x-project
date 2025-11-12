import type { CampDayDTO, GroupPermissionsDTO, UUID, DateISO } from "@/types";

export interface CampDaysFilterState {
  withoutActivities: boolean;
  searchTheme?: string;
}

export interface CampDayListItemVM {
  id: UUID;
  dayNumber: CampDayDTO["day_number"];
  date: DateISO;
  theme: CampDayDTO["theme"];
  slotsCount: number;
  totalMinutes: number;
}

export interface UserActionPermissionsVM {
  canManageDays: boolean;
}

export function mapPermissionsToActions(permissions: GroupPermissionsDTO | null | undefined): UserActionPermissionsVM {
  if (!permissions) {
    return { canManageDays: false };
  }

  return { canManageDays: permissions.role === "admin" };
}
