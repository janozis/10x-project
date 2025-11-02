import * as React from "react";
import type { TaskStatus } from "@/types";
import { GROUP_TASK_STATUS_ENUM } from "@/lib/validation/groupTask";

export interface StatusSelectProps {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps): JSX.Element {
  return (
    <select
      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      disabled={disabled}
    >
      {GROUP_TASK_STATUS_ENUM.map((s) => (
        <option value={s} key={s}>
          {statusLabel(s)}
        </option>
      ))}
    </select>
  );
}

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Oczekuje";
    case "in_progress":
      return "W toku";
    case "done":
      return "Zrobione";
    case "canceled":
      return "Anulowane";
  }
}


