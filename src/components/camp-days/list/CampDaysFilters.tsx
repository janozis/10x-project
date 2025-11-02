import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { CampDaysFilterState } from "./types";

export interface CampDaysFiltersProps {
  filters: CampDaysFilterState;
  disabled?: boolean;
  onChange: (next: CampDaysFilterState) => void;
  onReset: () => void;
}

export function CampDaysFilters({ filters, disabled = false, onChange, onReset }: CampDaysFiltersProps): React.ReactElement {
  const handleCheckboxChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, withoutActivities: event.target.checked });
    },
    [filters, onChange]
  );

  const handleSearchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, searchTheme: event.target.value });
    },
    [filters, onChange]
  );

  const handleSubmit = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-lg border bg-card/30 p-4 shadow-sm md:flex-row md:items-end"
      aria-label="Filtry listy dni obozu"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="camp-days-search">Szukaj motywu</Label>
        <Input
          id="camp-days-search"
          type="search"
          placeholder="np. Dzień wodny"
          value={filters.searchTheme ?? ""}
          onChange={handleSearchChange}
          autoComplete="off"
          disabled={disabled}
        />
      </div>

      <div className="flex flex-1 items-center gap-3 rounded-md border border-border/60 bg-background px-4 py-2 text-sm shadow-inner md:max-w-xs">
        <input
          id="camp-days-without-activities"
          type="checkbox"
          className="size-4 rounded border-muted-foreground text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          checked={filters.withoutActivities}
          onChange={handleCheckboxChange}
          disabled={disabled}
        />
        <div className="flex flex-col">
          <Label htmlFor="camp-days-without-activities" className="cursor-pointer text-sm">
            Tylko dni bez slotów
          </Label>
          <span className="text-xs text-muted-foreground">Filtruje dni bez zajęć w harmonogramie.</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        Wyczyść
      </button>
    </form>
  );
}


