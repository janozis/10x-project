import * as React from "react";
import type { TaskStatus, UUID } from "@/types";

export interface TaskFiltersVM {
  status?: TaskStatus;
  activityId?: UUID;
}

interface FiltersBarProps {
  filters: TaskFiltersVM;
  activities: { id: UUID; title: string }[];
  onChange: (patch: Partial<TaskFiltersVM>) => void;
}

export function FiltersBar({ filters, activities, onChange }: FiltersBarProps): JSX.Element {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as TaskStatus | "";
    onChange({ status: value ? (value as TaskStatus) : undefined });
  };
  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as UUID | "";
    onChange({ activityId: value ? (value as UUID) : undefined });
  };
  const handleReset = () => {
    onChange({ status: undefined, activityId: undefined });
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
      <label className="flex flex-col text-sm">
        <span className="mb-1 text-muted-foreground">Status</span>
        <select
          value={filters.status ?? ""}
          onChange={handleStatusChange}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          data-status-filter="true"
        >
          <option value="">Wszystkie</option>
          <option value="pending">Oczekujące</option>
          <option value="in_progress">W toku</option>
          <option value="done">Zrobione</option>
          <option value="canceled">Anulowane</option>
        </select>
      </label>

      <label className="flex flex-col text-sm">
        <span className="mb-1 text-muted-foreground">Aktywność</span>
        <select
          value={filters.activityId ?? ""}
          onChange={handleActivityChange}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          data-activity-filter="true"
        >
          <option value="">Wszystkie</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </label>

      <div className="md:ml-auto">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-accent"
          data-test-id="tasks-reset-filters-button"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
