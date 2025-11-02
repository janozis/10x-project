import * as React from "react";
import type { GroupPermissionsDTO, UUID } from "@/types";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  selectedIds: Set<UUID>;
  mode: "active" | "deleted";
  permissions?: GroupPermissionsDTO;
  onDeleteRequest?: (ids: UUID[]) => void;
  onClear?: () => void;
  onRestoreRequest?: (ids: UUID[]) => void;
  onEditRequest?: (id: UUID) => void;
}

export function BulkActionsBar({ selectedIds, mode, permissions, onDeleteRequest, onClear, onRestoreRequest, onEditRequest }: BulkActionsBarProps): JSX.Element | null {
  const count = selectedIds.size;
  if (count === 0) return null;
  const canDelete = permissions?.role === "admin" && mode === "active";
  const canRestore = permissions?.role === "admin" && mode === "deleted";
  const canEdit = (permissions?.role === "admin" || permissions?.role === "editor") && mode === "active";
  const isSingleSelection = count === 1;

  return (
    <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-md border bg-background/95 backdrop-blur px-3 py-2">
      <div className="text-sm">
        Zaznaczone: <span className="font-medium">{count}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onClear} disabled={false}>
          Odznacz
        </Button>
        {mode === "active" ? (
          <>
            {isSingleSelection && canEdit && onEditRequest ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onEditRequest(Array.from(selectedIds)[0])}
              >
                Edytuj
              </Button>
            ) : null}
            <Button type="button" variant="destructive" onClick={() => onDeleteRequest?.(Array.from(selectedIds))} disabled={!canDelete} aria-disabled={!canDelete}>
              Usuń {count > 1 ? `(${count})` : ""}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => onRestoreRequest?.(Array.from(selectedIds))} disabled={!canRestore} aria-disabled={!canRestore}>
            Przywróć {count > 1 ? `(${count})` : ""}
          </Button>
        )}
      </div>
    </div>
  );
}


