import * as React from "react";
import type { ActivityFeedFiltersVM, ActivityFeedEventType } from "@/lib/dashboard/activity-feed.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ActivityFeedFiltersProps {
  value: ActivityFeedFiltersVM;
  onChange: (next: ActivityFeedFiltersVM) => void;
  availableTypes: ActivityFeedEventType[];
}

export function ActivityFeedFilters({ value, onChange, availableTypes }: ActivityFeedFiltersProps): JSX.Element {
  const selected = new Set(value.types);

  function toggle(type: ActivityFeedEventType) {
    const next = new Set(selected);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onChange({ types: Array.from(next) as ActivityFeedEventType[] });
  }

  const activeCount = value.types.length;

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-muted-foreground">Filtry:</div>
      {availableTypes.map((t) => {
        const isActive = selected.has(t);
        return (
          <Button
            key={t}
            size="sm"
            variant={isActive ? "default" : "outline"}
            aria-pressed={isActive}
            onClick={() => toggle(t)}
          >
            {t === "activity_created" ? "Utworzone" : t === "activity_updated" ? "Zaktualizowane" : t}
          </Button>
        );
      })}
      <Badge variant="outline" className="ml-1 text-[10px]">{activeCount}</Badge>
      {activeCount === 0 ? (
        <span className="text-xs text-amber-600">Brak wyników — włącz przynajmniej jeden typ</span>
      ) : null}
    </div>
  );
}


