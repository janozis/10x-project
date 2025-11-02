import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GroupRole } from "@/types";

export interface MembersFiltersVM {
  q: string;
  role?: GroupRole | "all";
}
export interface MembersSort {
  by: "joined_at";
  direction: "asc" | "desc";
}

export interface MembersToolbarProps {
  filters: MembersFiltersVM;
  sort: MembersSort;
  count: number;
  onChangeFilters: (patch: Partial<MembersFiltersVM>) => void;
  onChangeSort: (patch: Partial<MembersSort>) => void;
}

export function MembersToolbar({ filters, sort, count, onChangeFilters, onChangeSort }: MembersToolbarProps): JSX.Element {
  function toggleSort(): void {
    const next = sort.direction === "asc" ? "desc" : "asc";
    onChangeSort({ direction: next });
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Szukaj po użytkowniku (user_id)"
          value={filters.q}
          onChange={(e) => onChangeFilters({ q: e.target.value })}
          aria-label="Szukaj"
          className="max-w-sm"
        />
        <select
          aria-label="Filtruj po roli"
          className="h-9 rounded-md border bg-background px-2 text-sm shadow-xs"
          value={filters.role ?? "all"}
          onChange={(e) => onChangeFilters({ role: e.target.value as MembersFiltersVM["role"] })}
        >
          <option value="all">Wszyscy</option>
          <option value="admin">Admini</option>
          <option value="editor">Edytorzy</option>
          <option value="member">Członkowie</option>
        </select>
        <Button variant="outline" onClick={toggleSort}>
          Sortuj: {sort.direction === "asc" ? "rosnąco" : "malejąco"}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{count} wyników</Badge>
        <Button variant="ghost" onClick={() => onChangeFilters({ q: "", role: "all" })}>Wyczyść</Button>
      </div>
    </div>
  );
}


