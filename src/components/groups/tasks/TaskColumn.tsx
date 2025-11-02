import * as React from "react";
import type { TaskStatus, UUID } from "@/types";
import type { TaskVM } from "@/lib/groups/tasks/useGroupTasks";
import { QuickAdd, type QuickAddInput } from "@/components/groups/tasks/QuickAdd";
import { TaskItem } from "@/components/groups/tasks/TaskItem";

interface TaskColumnProps {
  status: TaskStatus;
  tasks: TaskVM[];
  canEdit: boolean;
  activities: { id: UUID; title: string }[];
  defaultActivityId?: UUID;
  onCreateQuick?: (input: QuickAddInput) => Promise<void>;
  onSelectChange?: (id: UUID, selected: boolean) => void;
}

export function TaskColumn({
  status,
  tasks,
  canEdit,
  activities,
  defaultActivityId,
  onCreateQuick,
  onSelectChange,
}: TaskColumnProps): JSX.Element {
  return (
    <section aria-label={`Kolumna ${status}`} className="rounded-lg border bg-background p-3">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize">{labelForStatus(status)}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </header>

      {status === "pending" && onCreateQuick ? (
        <div className="mb-3">
          <QuickAdd defaultActivityId={defaultActivityId} canCreate={canEdit} onCreate={onCreateQuick} />
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <TaskItem
              task={t}
              canEdit={canEdit}
              activities={activities}
              onSelectChange={onSelectChange}
            />
          </li>
        ))}
        {tasks.length === 0 ? <li className="text-xs text-muted-foreground">Brak zadań.</li> : null}
      </ul>
    </section>
  );
}

function labelForStatus(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Oczekujące";
    case "in_progress":
      return "W toku";
    case "done":
      return "Zrobione";
    case "canceled":
      return "Anulowane";
    default:
      return status;
  }
}


