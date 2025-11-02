import * as React from "react";
import type { ActivityFeedEventVM } from "@/lib/dashboard/activity-feed.types";
import { Badge } from "@/components/ui/badge";

interface ActivityFeedItemProps {
  item: ActivityFeedEventVM;
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps): JSX.Element {
  return (
    <li className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden>
            {item.icon === "plus" ? "📝" : item.icon === "edit" ? "✏️" : "•"}
          </span>
          {item.href ? (
            <a href={item.href} className="font-medium hover:underline">
              {item.title}
            </a>
          ) : (
            <span className="font-medium" title="Wkrótce">
              {item.title}
            </span>
          )}
          <Badge variant="outline" className="text-[10px]">
            {item.type}
          </Badge>
        </div>
        <time className="text-xs text-muted-foreground" dateTime={item.at.toISOString()}>
          {formatTime(item.at)}
        </time>
      </div>
      {item.subtitle ? (
        <div className="mt-1 text-xs text-muted-foreground">{item.subtitle}</div>
      ) : null}
    </li>
  );
}

function formatTime(d: Date): string {
  try {
    return d.toLocaleString();
  } catch {
    return d.toISOString();
  }
}


