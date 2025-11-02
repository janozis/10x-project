import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface CampDaysHeaderProps {
  canManageDays: boolean;
  hasCampDays: boolean;
  createHref: string;
}

export function CampDaysHeader({ canManageDays, hasCampDays, createHref }: CampDaysHeaderProps): React.ReactElement {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dni obozu</h1>
        <p className="text-sm text-muted-foreground">
          Przeglądaj harmonogram dni obozu i zarządzaj ich zawartością.
        </p>
      </div>

      {canManageDays ? (
        <div className="flex items-center gap-3">
          <Button type="button" asChild className="w-full md:w-auto">
            <a href={createHref}>
              <Plus className="size-4" aria-hidden="true" />
              {hasCampDays ? "Dodaj dzień" : "Dodaj pierwszy dzień"}
            </a>
          </Button>
        </div>
      ) : null}
    </header>
  );
}


