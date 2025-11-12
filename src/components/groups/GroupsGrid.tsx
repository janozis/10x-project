import * as React from "react";
import type { GroupCardVM } from "@/lib/groups/types";
import { GroupCard } from "./GroupCard";

export interface GroupsGridProps {
  items: GroupCardVM[];
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onCopyInvite?: (code: string) => void;
  focusId?: string | null;
}

const GroupsGridComponent = ({ items, onDelete, onRestore, onCopyInvite, focusId }: GroupsGridProps): JSX.Element => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <GroupCard
          key={item.id}
          item={item}
          onDelete={onDelete}
          onRestore={onRestore}
          onCopyInvite={onCopyInvite}
          focusMe={focusId === item.id}
        />
      ))}
    </div>
  );
};

export const GroupsGrid = React.memo(GroupsGridComponent);
