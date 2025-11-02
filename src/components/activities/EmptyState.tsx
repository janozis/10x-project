import * as React from "react";
import { Button } from "@/components/ui/button";

interface ActivitiesEmptyStateProps {
  canCreate: boolean;
  reason?: "filters" | "empty";
  onCreateClick?: () => void;
}

export function ActivitiesEmptyState({ canCreate, reason = "empty", onCreateClick }: ActivitiesEmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center">
      <div className="text-sm text-muted-foreground">
        {reason === "filters" ? "Brak wyników dla wybranych filtrów." : "W tej grupie nie ma jeszcze żadnych aktywności."}
      </div>
      {canCreate ? (
        <Button type="button" onClick={onCreateClick}>
          Dodaj aktywność
        </Button>
      ) : null}
    </div>
  );
}


