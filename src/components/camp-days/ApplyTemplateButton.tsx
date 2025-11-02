import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addMinutes, type SlotVM } from "@/lib/camp-days/types";
import type { ActivityDTO, ActivityScheduleDTO, ApiSingle, TimeHHMM } from "@/types";
import { toast } from "sonner";

interface TemplateBlock { title: string; minutes: number }
const DEFAULT_TEMPLATE: TemplateBlock[] = [
  { title: "Poranny apel", minutes: 15 },
  { title: "Blok I", minutes: 90 },
  { title: "Przerwa", minutes: 15 },
  { title: "Obiad", minutes: 60 },
  { title: "Blok II", minutes: 90 },
  { title: "Wieczorne podsumowanie", minutes: 30 },
];

export interface ApplyTemplateButtonProps {
  groupId: string;
  campDayId: string;
  slots: SlotVM[];
  canEdit: boolean;
  onApplied: () => Promise<void> | void;
}

export function ApplyTemplateButton({ groupId, campDayId, slots, canEdit, onApplied }: ApplyTemplateButtonProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[ApplyTemplateButton] canEdit:", canEdit);
    }
  }, [canEdit]);

  const baseStart: TimeHHMM = (slots[0]?.startTime || "09:00") as TimeHHMM; // if list exists, keep day start
  const initialStart: TimeHHMM = (slots[slots.length - 1]?.endTime || baseStart) as TimeHHMM;

  const preview = React.useMemo(() => {
    let cursor = initialStart;
    return DEFAULT_TEMPLATE.map((b, idx) => {
      const start = cursor;
      const end = addMinutes(start, b.minutes);
      cursor = end;
      return { idx, title: b.title, start, end };
    });
  }, [initialStart]);

  const createActivity = async (title: string, durationMinutes: number): Promise<ActivityDTO | null> => {
    const res = await fetch(`/api/groups/${groupId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        objective: `Automatycznie utworzona aktywność dla bloku: ${title}`,
        tasks: "-",
        duration_minutes: durationMinutes,
        location: "-",
        materials: "-",
        responsible: "-",
        knowledge_scope: "-",
        participants: "-",
        flow: "-",
        summary: "-",
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiSingle<ActivityDTO>;
    return body.data;
  };

  const apply = async () => {
    setProcessing(true);
    try {
      // Create activities sequentially, then schedules
      let order = slots.length + 1;
      for (const block of preview) {
        const minutes = diffMinutes(block.start, block.end);
        const act = await createActivity(block.title, minutes);
        if (!act) {
          toast.error(`Nie udało się utworzyć aktywności: ${block.title}`);
          continue;
        }
        const sres = await fetch(`/api/camp-days/${campDayId}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activity_id: act.id, start_time: block.start, end_time: block.end, order_in_day: order }),
        });
        if (!sres.ok) {
          const msg = `Błąd dodawania slotu dla ${block.title}`;
          toast.error(msg);
        } else {
          // consume body to avoid stream leaks
          void (await sres.json() as ApiSingle<ActivityScheduleDTO>);
          order += 1;
        }
      }
      toast.success("Zastosowano szablon dnia");
      setOpen(false);
      await onApplied();
    } catch {
      toast.error("Błąd zastosowania szablonu");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("[ApplyTemplateButton] Clicked, canEdit:", canEdit);
          if (canEdit) {
            setOpen(true);
          }
        }} 
        disabled={!canEdit}
      >
        Zastosuj szablon
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Szablon dnia</DialogTitle>
          <DialogDescription>Dodajemy serię bloków czasowych jako nowe sloty od {initialStart}.</DialogDescription>
        </DialogHeader>
        <div className="rounded border divide-y">
          {preview.map((p) => (
            <div key={p.idx} className="flex items-center justify-between p-2 text-sm">
              <div className="font-medium">{p.title}</div>
              <div className="text-muted-foreground">{p.start}–{p.end}</div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>Anuluj</Button>
          <Button onClick={() => { void apply(); }} disabled={processing}>
            {processing ? "Przetwarzanie…" : "Zastosuj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function diffMinutes(a: TimeHHMM, b: TimeHHMM): number {
  const [ah, am] = a.split(":").map((x) => parseInt(x, 10));
  const [bh, bm] = b.split(":").map((x) => parseInt(x, 10));
  return bh * 60 + bm - (ah * 60 + am);
}


