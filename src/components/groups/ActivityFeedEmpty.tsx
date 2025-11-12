import * as React from "react";
import { Button } from "@/components/ui/button";

interface ActivityFeedEmptyProps {
  onClearFilters?: () => void;
  filtered?: boolean;
}

export function ActivityFeedEmpty({ onClearFilters, filtered = false }: ActivityFeedEmptyProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
        <span>📭</span>
      </div>
      <div className="font-medium text-foreground">
        {filtered ? "Brak aktywności dla wybranych filtrów" : "Brak aktywności do wyświetlenia"}
      </div>
      {filtered && onClearFilters ? (
        <Button size="sm" variant="outline" onClick={onClearFilters}>
          Wyczyść filtry
        </Button>
      ) : null}
    </div>
  );
}
