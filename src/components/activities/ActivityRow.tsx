import * as React from "react";
import type { ActivityWithEditorsDTO } from "@/types";

interface ActivityRowProps {
  item: ActivityWithEditorsDTO;
}

export function ActivityRow({ item }: ActivityRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 p-3 border-t">
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{item.title}</div>
        <div className="text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</div>
      </div>
      <div className="text-sm text-muted-foreground line-clamp-2">{item.objective}</div>
    </div>
  );
}
