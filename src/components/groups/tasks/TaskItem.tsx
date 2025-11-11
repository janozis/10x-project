import * as React from "react";
import type { TaskStatus, UUID } from "@/types";
import type { TaskVM } from "@/lib/groups/tasks/useGroupTasks";

interface TaskItemProps {
  task: TaskVM;
  canEdit: boolean;
  activities: { id: UUID; title: string }[];
  onSelectChange?: (id: UUID, selected: boolean) => void;
}

export function TaskItem({ task, canEdit, activities, onSelectChange }: TaskItemProps): JSX.Element {
  const activityTitle = task.activityId ? activities.find((a) => a.id === task.activityId)?.title : null;

  return (
    <div className="relative rounded-md border p-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-2">
        {canEdit ? (
          <input
            type="checkbox"
            className="mt-1 relative z-10"
            aria-label="Zaznacz zadanie"
            onChange={(e) => {
              onSelectChange?.(task.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}

        <a href={`/tasks/${task.id}?from=tasks`} className="flex-1 min-w-0 block">
          {/* Title */}
          <div className="font-medium text-sm mb-2 truncate">{task.title}</div>

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${getStatusColorClass(
                task.status
              )}`}
            >
              {task.statusLabel}
            </span>

            {/* Due date badge */}
            {task.dueDate ? (
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 ${
                  task.isOverdue
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {task.isOverdue ? "⚠️ " : "📅 "}
                {task.dueDate}
              </span>
            ) : null}

            {/* Activity badge */}
            {activityTitle ? (
              <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-muted-foreground">
                🎯 {activityTitle}
              </span>
            ) : null}
          </div>

          {/* Description preview (if exists) */}
          {task.description ? (
            <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{task.description}</div>
          ) : null}
        </a>
      </div>
    </div>
  );
}

function getStatusColorClass(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "done":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "canceled":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
}
