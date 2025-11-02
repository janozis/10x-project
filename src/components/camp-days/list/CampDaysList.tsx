import * as React from "react";

import type { CampDayListItemVM } from "./types";
import { CampDayCard } from "./CampDayCard";

export interface CampDaysListProps {
  items: CampDayListItemVM[];
  onOpen: (id: string) => void;
  highlightId?: string | null;
}

export function CampDaysList({
  items,
  onOpen,
  highlightId,
}: CampDaysListProps): React.ReactElement {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="list">
      {items.map((item) => (
        <CampDayCard
          key={item.id}
          item={item}
          onOpen={() => onOpen(item.id)}
          isHighlighted={highlightId === item.id}
        />
      ))}
    </div>
  );
}
