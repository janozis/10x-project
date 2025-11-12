import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActivityDTO, ActivityScheduleDTO, ApiList, ApiSingle, TimeHHMM } from "@/types";
import type { SlotVM } from "@/lib/camp-days/types";
import { mapScheduleToSlotVM, addMinutes } from "@/lib/camp-days/types";
import { toast } from "sonner";

export interface AddSlotButtonProps {
  groupId: string;
  campDayId: string;
  slots: SlotVM[];
  canEdit: boolean;
  onCreated: (slot: SlotVM) => void;
}

export function AddSlotButton({ groupId, campDayId, slots, canEdit, onCreated }: AddSlotButtonProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<ActivityDTO[]>([]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[AddSlotButton] canEdit:", canEdit);
    }
  }, [canEdit]);

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
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, groupId]);

  const defaultStartEnd = React.useMemo((): { start: TimeHHMM; end: TimeHHMM } => {
    const last = slots[slots.length - 1];
    const start = last ? last.endTime : ("09:00" as TimeHHMM);
    const end = addMinutes(start, 60);
    return { start, end };
  }, [slots]);

  const createWithActivity = async (activityId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/camp-days/${campDayId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          start_time: defaultStartEnd.start,
          end_time: defaultStartEnd.end,
          order_in_day: slots.length + 1,
        }),
      });
      if (!res.ok) {
        toast.error("Nie udało się dodać slotu");
        return;
      }
      const out = (await res.json()) as ApiSingle<ActivityScheduleDTO>;
      const vm = mapScheduleToSlotVM(out.data, true);
      onCreated(vm);
      setOpen(false);
      toast.success("Dodano slot");
    } catch {
      toast.error("Błąd sieci podczas dodawania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={!canEdit}
          size="sm"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log("[AddSlotButton] Clicked, canEdit:", canEdit);
          }}
        >
          Dodaj slot
        </Button>
      </DialogTrigger>
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
                    <Button size="sm" onClick={() => createWithActivity(a.id)} disabled={loading}>
                      Wybierz
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Domyślny czas: {defaultStartEnd.start}–{defaultStartEnd.end}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
