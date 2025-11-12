import * as React from "react";
import type { TaskStatus, UUID } from "@/types";

interface BulkActionsBarProps {
  selectedIds: UUID[];
  onBulkStatus: (status: TaskStatus) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  canEdit?: boolean;
}

export function BulkActionsBar({
  selectedIds,
  onBulkStatus,
  onBulkDelete,
  canEdit = false,
}: BulkActionsBarProps): JSX.Element | null {
  if (!canEdit || selectedIds.length === 0) return null;
  const disabled = !canEdit || selectedIds.length === 0;
  return (
    <div className="sticky bottom-2 z-10 hidden lg:flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <span className="text-xs text-muted-foreground">Zaznaczone: {selectedIds.length}</span>
      <div className="h-4 w-px bg-border mx-1" />
      <button
        type="button"
        className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-2 text-xs hover:bg-accent"
        onClick={() => {
          void onBulkStatus("pending");
        }}
        disabled={disabled}
      >
        Oczekujące
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-2 text-xs hover:bg-accent"
        onClick={() => {
          void onBulkStatus("in_progress");
        }}
        disabled={disabled}
      >
        W toku
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-2 text-xs hover:bg-accent"
        onClick={() => {
          void onBulkStatus("done");
        }}
        disabled={disabled}
      >
        Zrobione
      </button>
      <div className="ml-auto" />
      <button
        type="button"
        className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-2 text-xs hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => {
          void onBulkDelete();
        }}
        disabled={disabled}
      >
        Usuń wybrane
      </button>
    </div>
  );
}
