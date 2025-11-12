import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActivityDTO, ApiList } from "@/types";

export interface ActivityPickerDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (activity: ActivityDTO) => void | Promise<void>;
}

export function ActivityPickerDialog({ groupId, open, onOpenChange, onPick }: ActivityPickerDialogProps): JSX.Element {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<ActivityDTO[]>([]);

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!open) return;
      try {
        const res = await fetch(`/api/groups/${groupId}/activities?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const body = (await res.json()) as ApiList<ActivityDTO>;
        setItems(body.data);
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, groupId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wybierz aktywność</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Szukaj po tytule…" value={q} onChange={(e) => setQ(e.currentTarget.value)} />
          <div className="max-h-64 overflow-auto rounded border">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Brak wyników</div>
            ) : (
              <ul>
                {items.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.status}</div>
                    </div>
                    <Button size="sm" onClick={() => onPick(a)}>
                      Wybierz
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
