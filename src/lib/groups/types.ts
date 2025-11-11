import type { DateISO, GroupStatus, TimestampISO, UUID, ApiListResponse, ApiResponse, GroupDTO } from "@/types";

export interface GroupCardVM {
  id: UUID;
  name: string;
  periodLabel: string;
  loreTheme: string;
  status: GroupStatus;
  inviteCode?: string | null;
  maxMembers?: number | null;
  createdAt: TimestampISO;
  updatedAt: TimestampISO;
  isArchived: boolean;
}

export interface GroupFormValues {
  name: string;
  description: string;
  lore_theme: string;
  start_date: DateISO;
  end_date: DateISO;
  max_members?: number | null;
}

export interface JoinGroupFormValues {
  code: string;
}

export interface GroupsListState {
  loading: boolean;
  error?: string;
  items: GroupDTO[];
  showDeleted: boolean;
}

export type { ApiListResponse, ApiResponse };
