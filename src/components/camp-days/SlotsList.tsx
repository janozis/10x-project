import * as React from "react";
import type { SlotVM } from "@/lib/camp-days/types";
import { SlotRow } from "@/components/camp-days/SlotRow";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSlot } from "@/components/camp-days/SortableSlot";
import { useSchedulesDndController } from "@/lib/camp-days/useSchedulesDndController";
import { Button } from "@/components/ui/button";

export interface SlotsListProps {
  slots: SlotVM[];
  canEdit: boolean;
  onAnyChangeState: (state: "idle" | "saving" | "saved" | "error") => void;
  onLocalUpdate: (id: string, partial: Partial<SlotVM>) => void;
  onServerApplied: (id: string, next: SlotVM) => void;
  onDeleteSlot?: (id: string) => Promise<void> | void;
  onReorder: (nextSlots: SlotVM[]) => void;
  onDuplicateSlot?: (slot: SlotVM) => Promise<void> | void;
  groupId?: string;
}

const SlotsListComponent = ({
  slots,
  canEdit,
  onAnyChangeState,
  onLocalUpdate,
  onServerApplied,
  onDeleteSlot,
  onReorder,
  onDuplicateSlot,
  groupId,
}: SlotsListProps): JSX.Element => {
  if (!slots.length) {
    return <div className="text-sm text-muted-foreground">Brak slotów na ten dzień.</div>;
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { handleDragEnd } = useSchedulesDndController(slots, (next) => onReorder(next), onAnyChangeState);

  return (
    <div className="space-y-2" aria-live="polite">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {slots.map((slot) => (
            <SortableSlot key={slot.id} id={slot.id}>
              <SlotRow
                slot={slot}
                disabled={!canEdit}
                onAnyChangeState={onAnyChangeState}
                onLocalChange={(partial) => onLocalUpdate(slot.id, partial)}
                onServerApplied={(next) => onServerApplied(slot.id, next)}
                onDelete={onDeleteSlot ? () => onDeleteSlot(slot.id) : undefined}
                onDuplicate={onDuplicateSlot ? () => onDuplicateSlot(slot) : undefined}
                groupId={groupId}
              />
            </SortableSlot>
          ))}
        </SortableContext>
      </DndContext>
      {!canEdit ? <p className="text-xs text-muted-foreground">Brak uprawnień do edycji.</p> : null}
    </div>
  );
};

export const SlotsList = React.memo(SlotsListComponent);
