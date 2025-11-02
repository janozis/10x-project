import * as React from "react";
import type { TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface TaskHeaderProps {
  title: string;
  status: TaskStatus;
}

function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500 text-white border-transparent";
    case "in_progress":
      return "bg-blue-600 text-white border-transparent";
    case "done":
      return "bg-emerald-600 text-white border-transparent";
    case "canceled":
      return "bg-red-600 text-white border-transparent";
    default:
      return "";
  }
}

export function TaskHeader({ title, status }: TaskHeaderProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Badge className={statusBadgeClass(status)}>{statusLabel(status)}</Badge>
    </div>
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


