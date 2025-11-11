import * as React from "react";
import type { UUID } from "@/types";

interface EditorsAvatarGroupProps {
  userIds: UUID[];
}

function initialsFromUserId(id: string): string {
  // Simple fallback initials from UUID
  return id.slice(0, 2).toUpperCase();
}

export function EditorsAvatarGroup({ userIds }: EditorsAvatarGroupProps): JSX.Element {
  const ids = userIds.slice(0, 4);
  const rest = userIds.length - ids.length;
  return (
    <div className="flex items-center -space-x-2">
      {ids.map((id) => (
        <div
          key={id}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-muted text-[10px] font-medium"
          title={id}
          aria-label={id}
        >
          {initialsFromUserId(id)}
        </div>
      ))}
      {rest > 0 ? (
        <div
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-muted text-[10px] font-medium"
          aria-label={`+${rest}`}
        >
          +{rest}
        </div>
      ) : null}
    </div>
  );
}
