import * as React from "react";
import { Button } from "@/components/ui/button";

interface RowActionsMenuProps {
  mode: "active" | "deleted";
  canEdit: boolean;
  canDelete: boolean;
  canRestore: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
}

export function RowActionsMenu({ mode, canEdit, canDelete, canRestore, onEdit, onDelete, onRestore }: RowActionsMenuProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button type="button" size="icon" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="h-7 w-7">
        ⋯
      </Button>
      {open ? (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-40 rounded-md border bg-background p-1 shadow-md">
          {mode === "active" ? (
            <>
              {canEdit ? (
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { onEdit?.(); setOpen(false); }}
                >
                  Edytuj
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                onClick={() => { onDelete?.(); setOpen(false); }}
                disabled={!canDelete}
                aria-disabled={!canDelete}
              >
                Usuń
              </button>
            </>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              onClick={() => { onRestore?.(); setOpen(false); }}
              disabled={!canRestore}
              aria-disabled={!canRestore}
            >
              Przywróć
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}


