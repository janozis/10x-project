import * as React from "react";
import type { UUID } from "@/types";

export interface TaskMetaProps {
  createdAt: string;
  updatedAt: string;
  groupId: UUID;
  activityId?: UUID | null;
}

export function TaskMeta({ createdAt, updatedAt, groupId, activityId }: TaskMetaProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
      <div>
        <span className="font-medium text-foreground">Utworzono:</span> {formatDateTime(createdAt)}
      </div>
      <div>
        <span className="font-medium text-foreground">Zaktualizowano:</span> {formatDateTime(updatedAt)}
      </div>
      <div>
        <span className="font-medium text-foreground">Grupa:</span> <a className="underline" href={`/groups/${groupId}`}>{groupId}</a>
      </div>
      <div>
        <span className="font-medium text-foreground">Aktywność:</span>{" "}
        {activityId ? (
          <a className="underline" href={`/activities/${activityId}`}>{activityId}</a>
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}


