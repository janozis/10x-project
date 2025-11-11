import * as React from "react";
import { CalendarX2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface CampDaysEmptyStateProps {
  canManageDays: boolean;
  createHref: string;
}

export function CampDaysEmptyState({ canManageDays, createHref }: CampDaysEmptyStateProps): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 p-10 text-center text-muted-foreground"
      role="status"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-background shadow-sm">
        <CalendarX2 className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Brak dni obozu</h2>
        <p className="text-sm text-muted-foreground">
          Ta grupa nie ma jeszcze zdefiniowanych dni. Utwórz pierwszy dzień, by rozpocząć planowanie harmonogramu.
        </p>
      </div>
      {canManageDays ? (
        <Button type="button" asChild className="mt-2">
          <a href={createHref}>
            <Plus className="size-4" aria-hidden="true" />
            Dodaj dzień obozu
          </a>
        </Button>
      ) : null}
    </div>
  );
}
