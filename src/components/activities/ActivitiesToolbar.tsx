import * as React from "react";
import type { ActivityStatus } from "@/types";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface ActivitiesListFilters {
  status?: ActivityStatus;
  assigned?: "me";
  search?: string;
}

interface ActivitiesToolbarProps {
  value: ActivitiesListFilters;
  onChange: (next: ActivitiesListFilters) => void;
  disabled?: boolean;
  showAssigned?: boolean;
  right?: React.ReactNode; // Columns configurator area
  canCreate?: boolean;
  onCreateClick?: () => void;
}

export function ActivitiesToolbar({
  value,
  onChange,
  disabled,
  showAssigned = true,
  right,
  canCreate,
  onCreateClick,
}: ActivitiesToolbarProps): JSX.Element {
  const [searchLocal, setSearchLocal] = React.useState<string>(value.search || "");
  const debounced = useDebouncedValue(searchLocal, 300);

  React.useEffect(() => {
    if ((value.search || "") === debounced) return;
    const trimmed = debounced.trim();
    onChange({ ...value, search: trimmed.length ? trimmed : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  React.useEffect(() => {
    setSearchLocal(value.search || "");
  }, [value.search]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Label htmlFor="search" className="sr-only">
          Szukaj
        </Label>
        <Input
          id="search"
          placeholder="Szukaj w tytułach i celach…"
          value={searchLocal}
          disabled={disabled}
          onChange={(e) => setSearchLocal(e.target.value)}
          className="w-64"
          data-test-id="activities-search-input"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="status" className="text-sm text-muted-foreground">
          Status
        </Label>
        <select
          id="status"
          value={value.status || ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, status: (e.target.value || undefined) as ActivityStatus | undefined })}
          className="px-2 py-1 text-sm rounded-md border bg-background"
          data-test-id="activities-status-filter"
        >
          <option value="">Wszystkie</option>
          <option value="draft">Szkic</option>
          <option value="review">Do przeglądu</option>
          <option value="ready">Gotowe</option>
          <option value="archived">Zarchiwizowane</option>
        </select>
      </div>

      {showAssigned ? (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.assigned === "me"}
            onChange={(e) => onChange({ ...value, assigned: e.target.checked ? "me" : undefined })}
            disabled={disabled}
            data-test-id="activities-assigned-checkbox"
          />
          <span>Tylko moje</span>
        </label>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            onClick={onCreateClick}
            disabled={disabled}
            data-test-id="activities-create-button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Dodaj aktywność
          </Button>
        ) : null}
        {right}
      </div>
    </div>
  );
}
