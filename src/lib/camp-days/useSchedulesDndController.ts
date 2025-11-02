import * as React from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { ApiError, ApiSingle, ActivityScheduleDTO } from "@/types";
import type { SlotVM } from "@/lib/camp-days/types";

export function useSchedulesDndController(
  slots: SlotVM[],
  applyLocalSlots: (next: SlotVM[]) => void,
  onAnyChangeState: (state: "idle" | "saving" | "saved" | "error", message?: string) => void
) {
  const prevRef = React.useRef<SlotVM[]>(slots);

  React.useEffect(() => {
    prevRef.current = slots;
  }, [slots]);

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = slots.findIndex((s) => s.id === active.id);
      const newIndex = slots.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(slots, oldIndex, newIndex).map((s, idx) => ({ ...s, orderInDay: idx + 1 }));
      const changes = reordered.filter((s, idx) => s.orderInDay !== slots[idx]?.orderInDay);

      applyLocalSlots(reordered);
      if (!changes.length) return;

      onAnyChangeState("saving");

      try {
        for (const s of changes) {
          const res = await fetch(`/api/activity-schedules/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_in_day: s.orderInDay }),
          });
          if (!res.ok) {
            const err = (await res.json()) as ApiError;
            applyLocalSlots(prevRef.current);
            onAnyChangeState("error", err.error?.message || "Błąd zmiany kolejności");
            return;
          }
          // Optional: ensure server responded with updated DTO
          const out = (await res.json()) as ApiSingle<ActivityScheduleDTO>;
          // Sync order if server adjusted values
          applyLocalSlots(
            (prevRef.current = prevRef.current.map((p) => (p.id === out.data.id ? { ...p, orderInDay: out.data.order_in_day } : p)))
          );
        }
        onAnyChangeState("saved");
        setTimeout(() => onAnyChangeState("idle"), 800);
      } catch {
        applyLocalSlots(prevRef.current);
        onAnyChangeState("error", "Błąd sieci przy zmianie kolejności");
      }
    },
    [slots, applyLocalSlots, onAnyChangeState]
  );

  return { handleDragEnd } as const;
}


