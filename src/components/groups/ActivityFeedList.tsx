import * as React from "react";
import type { ActivityFeedEventVM } from "@/lib/dashboard/activity-feed.types";
import { ActivityFeedItem } from "@/components/groups/ActivityFeedItem";

interface ActivityFeedListProps {
  items: ActivityFeedEventVM[];
}

export function ActivityFeedList({ items }: ActivityFeedListProps): JSX.Element {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Brak aktywności do wyświetlenia.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((ev) => (
        <ActivityFeedItem key={`${ev.type}-${ev.eventId}-${ev.at.toISOString()}`} item={ev} />
      ))}
    </ul>
  );
}
