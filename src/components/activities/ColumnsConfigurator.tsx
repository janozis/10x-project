import * as React from "react";
import type { ColumnVisibilityState } from "@/lib/groups/useColumnPreferences";
import { Button } from "@/components/ui/button";

interface ColumnsConfiguratorProps {
  state: ColumnVisibilityState;
  onToggle: (column: keyof ColumnVisibilityState) => void;
  onReset: () => void;
}

export function ColumnsConfigurator({ state, onToggle, onReset }: ColumnsConfiguratorProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Kolumny
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Konfiguracja kolumn"
          className="absolute right-0 mt-2 w-64 rounded-md border bg-background p-2 shadow-lg z-50"
        >
          <div className="flex flex-col gap-2">
            {Object.keys(state).map((key) => {
              const k = key as keyof ColumnVisibilityState;
              return (
                <label key={k as string} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={state[k]} onChange={() => onToggle(k)} disabled={k === "title"} />
                  <span>{labelForColumn(k)}</span>
                </label>
              );
            })}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-8 px-2"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                Resetuj
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function labelForColumn(id: keyof ColumnVisibilityState): string {
  switch (id) {
    case "title":
      return "Tytuł";
    case "objective":
      return "Cel";
    case "ai":
      return "AI";
    case "editors":
      return "Edytorzy";
    case "updated_at":
      return "Aktualizacja";
    default:
      return String(id);
  }
}
