import type { UUID, GroupDashboardDTO } from "@/types";

export type ActivityFeedEventType = "activity_created" | "activity_updated";

export interface ActivityFeedEventVM {
  eventId: UUID;
  resourceType: "activity";
  resourceId: UUID;
  type: ActivityFeedEventType | "other";
  at: Date;
  user: { id: UUID; displayName?: string };
  title: string;
  subtitle?: string;
  icon: "plus" | "edit" | "dot";
  href?: string;
}

export interface ActivityFeedFiltersVM {
  types: ActivityFeedEventType[];
}

export type RealtimeStatus = "live" | "reconnecting" | "off";

export type RecentActivityDTOItem = GroupDashboardDTO["recent_activity"][number];


