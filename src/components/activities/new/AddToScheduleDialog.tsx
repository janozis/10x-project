import * as React from "react";
import type { UUID, CampDayDTO, ApiListResponse, ActivityScheduleDTO, ApiResponse, ApiError } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface AddToScheduleDialogProps {
  open: boolean;
  groupId: UUID;
  activityId?: UUID;
  onClose: () => void;
  onCreated: () => void;
}
interface FormState {
  campDayId: UUID | "";
  start_time: string;
  end_time: string;
  order_in_day: number | "";
}

function isHHMM(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

export default function AddToScheduleDialog({
  open,
  onClose,
  groupId,
  activityId,
  onCreated,
}: AddToScheduleDialogProps) {
  const [loadingDays, setLoadingDays] = React.useState(false);
  const [days, setDays] = React.useState<CampDayDTO[]>([]);
  const [form, setForm] = React.useState<FormState>({ campDayId: "", start_time: "", end_time: "", order_in_day: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;
    let ignore = false;
    (async () => {
      setLoadingDays(true);
      try {
        const res = await fetch(`/api/groups/${groupId}/camp-days`, { method: "GET" });
        const json = (await res.json()) as ApiListResponse<CampDayDTO>;
        if (ignore) return;
        if (res.ok && "data" in json) setDays(json.data);
        else setDays([]);
      } catch {
        if (!ignore) setDays([]);
      } finally {
        if (!ignore) setLoadingDays(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [open, groupId]);

  const onSubmit = React.useCallback(async () => {
    if (!activityId) return;
    setOrderError(undefined);
    if (!form.campDayId) {
      toast.error("Wybierz dzień obozu.");
      return;
    }
    if (!isHHMM(form.start_time) || !isHHMM(form.end_time)) {
      toast.error("Czas musi być w formacie HH:MM.");
      return;
    }
    const [sh, sm] = form.start_time.split(":").map((x) => parseInt(x, 10));
    const [eh, em] = form.end_time.split(":").map((x) => parseInt(x, 10));
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (!(startMin < endMin)) {
      toast.error("Godzina zakończenia musi być po rozpoczęciu.");
      return;
    }
    const order =
      typeof form.order_in_day === "number" ? form.order_in_day : parseInt(String(form.order_in_day || 0), 10);
    if (!Number.isInteger(order) || order < 1) {
      toast.error("Kolejność w dniu musi być liczbą całkowitą >= 1.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        activity_id: activityId,
        start_time: form.start_time,
        end_time: form.end_time,
        order_in_day: order,
      };
      const res = await fetch(`/api/camp-days/${form.campDayId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<ActivityScheduleDTO>;
      if (!res.ok || "error" in json) {
        const err = json as ApiError;
        if (err.error.code === "ORDER_IN_DAY_CONFLICT") {
          setOrderError("Ta kolejność jest już zajęta dla wybranego dnia. Wybierz inną wartość.");
        } else {
          toast.error(err.error.message || "Nie udało się utworzyć wpisu w harmonogramie.");
        }
        return;
      }
      onCreated();
    } catch (e: unknown) {
      toast.error(e?.message || "Błąd sieci");
    } finally {
      setSubmitting(false);
    }
  }, [activityId, form, onCreated]);

  // Clear inline order conflict when user modifies order or switches day
  React.useEffect(() => {
    setOrderError(undefined);
  }, [form.order_in_day, form.campDayId]);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj do planu dnia</DialogTitle>
          <DialogDescription>Wybierz dzień obozu i podaj godziny.</DialogDescription>
        </DialogHeader>
        {!activityId ? (
          <div className="text-sm text-neutral-600">Aktywność musi zostać najpierw utworzona.</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="camp_day_id">Dzień obozu</Label>
              <select
                id="camp_day_id"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={form.campDayId}
                onChange={(e) => setForm((f) => ({ ...f, campDayId: e.target.value as UUID }))}
                disabled={loadingDays}
              >
                <option value="">— wybierz dzień —</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dzień {d.day_number} — {d.date}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="start_time">Start (HH:MM)</Label>
                <Input
                  id="start_time"
                  placeholder="09:00"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_time">Koniec (HH:MM)</Label>
                <Input
                  id="end_time"
                  placeholder="10:15"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order_in_day">Kolejność w dniu</Label>
                <Input
                  id="order_in_day"
                  type="number"
                  min={1}
                  aria-invalid={orderError ? true : undefined}
                  aria-describedby={orderError ? "order_in_day_error" : undefined}
                  value={form.order_in_day === "" ? "" : String(form.order_in_day)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, order_in_day: e.target.value === "" ? "" : parseInt(e.target.value, 10) }))
                  }
                />
                {orderError && (
                  <p id="order_in_day_error" className="text-xs text-red-600">
                    {orderError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
          <Button type="button" onClick={() => void onSubmit()} disabled={!activityId || submitting}>
            {submitting ? "Zapisywanie..." : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
