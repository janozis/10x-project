import * as React from "react";
import type { SlotVM } from "@/lib/camp-days/types";
import { TimeRangeEditor } from "@/components/camp-days/TimeRangeEditor";
import type { TimeHHMM } from "@/types";
import { useAutosaveSchedule } from "@/lib/camp-days/useAutosaveSchedule";
import { Button } from "@/components/ui/button";
import { ActivityBadge } from "@/components/camp-days/ActivityBadge";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";

export interface SlotRowProps {
  slot: SlotVM;
  disabled?: boolean;
  onLocalChange: (partial: Partial<SlotVM>) => void;
  onServerApplied: (next: SlotVM) => void;
  onAnyChangeState: (state: "idle" | "saving" | "saved" | "error") => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  groupId?: string;
}

export const SlotRow = ({
  slot,
  disabled,
  onLocalChange,
  onServerApplied,
  onAnyChangeState,
  onDelete,
  onDuplicate,
}: SlotRowProps): JSX.Element => {
  const { queue } = useAutosaveSchedule(slot.id, {
    onStateChange: onAnyChangeState,
    onServerApplied: (dto) => {
      onServerApplied({
        ...slot,
        startTime: dto.start_time,
        endTime: dto.end_time,
        orderInDay: dto.order_in_day,
      });
    },
  });

  const handleTimeChange = (next: { start: TimeHHMM; end: TimeHHMM }) => {
    onLocalChange({ startTime: next.start, endTime: next.end });
    queue({ start_time: next.start, end_time: next.end });
  };

  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleRowClick = () => {
    if (slot.activity?.id && slot.campDayId) {
      // Navigate to details view with context about where we came from
      window.location.href = `/activities/${slot.activity.id}?from=camp-day&camp_day_id=${slot.campDayId}`;
    } else if (slot.activity?.id) {
      window.location.href = `/activities/${slot.activity.id}`;
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick();
        }
      }}
      aria-label={`Zobacz szczegóły aktywności: ${slot.activity?.title ?? "Aktywność"}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-6 text-right">{slot.orderInDay}.</span>
        <TimeRangeEditor
          start={slot.startTime}
          end={slot.endTime}
          disabled={disabled || !slot.canEdit}
          onChange={handleTimeChange}
        />
        <ActivityBadge title={slot.activity?.title} status={slot.activity?.status} />
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {onDuplicate ? (
          <Button variant="ghost" size="sm" onClick={onDuplicate} disabled={disabled || !slot.canEdit}>
            Duplikuj
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={disabled || !slot.canEdit}
            aria-label="Usuń slot"
          >
            Usuń
          </Button>
        ) : null}
      </div>
      {onDelete ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Usunąć slot?"
          description="Tej operacji nie można cofnąć."
          variant="destructive"
          confirmText="Usuń"
          onConfirm={async () => {
            setConfirmOpen(false);
            await onDelete();
          }}
        />
      ) : null}
    </div>
  );
};
