import * as React from "react";
import type { ApiError, ApiList, ApiSingle, ActivityScheduleDTO, CampDayDTO, GroupPermissionsDTO, UUID } from "@/types";
import { mapScheduleToSlotVM, minutesBetween, type ConflictMessage, type SlotVM } from "@/lib/camp-days/types";

export interface UseCampDayDataResult {
  campDay: CampDayDTO | null;
  slots: SlotVM[];
  totalMinutes: number;
  conflicts: ConflictMessage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSlots: React.Dispatch<React.SetStateAction<SlotVM[]>>;
}

export function useCampDayData(
  groupId: UUID,
  campDayId: UUID,
  initialCampDay?: CampDayDTO,
  permissions?: GroupPermissionsDTO | null
): UseCampDayDataResult {
  const [campDay, setCampDay] = React.useState<CampDayDTO | null>(initialCampDay ?? null);
  const [slots, setSlots] = React.useState<SlotVM[]>([]);
  const [conflicts, setConflicts] = React.useState<ConflictMessage[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const canEditAll = Boolean(permissions && (permissions.role === "admin" || permissions.role === "editor"));

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Camp day details (skip if provided)
      if (!initialCampDay) {
        const cdRes = await fetch(`/api/camp-days/${campDayId}`);
        if (!cdRes.ok) {
          const body = (await cdRes.json()) as ApiError;
          throw new Error(body.error?.message || "Nie udało się załadować dnia");
        }
        const cdBody = (await cdRes.json()) as ApiSingle<CampDayDTO>;
        setCampDay(cdBody.data);
      }

      const scRes = await fetch(`/api/camp-days/${campDayId}/schedules`);
      if (!scRes.ok) {
        const body = (await scRes.json()) as ApiError;
        throw new Error(body.error?.message || "Nie udało się załadować harmonogramu");
      }
      const scBody = (await scRes.json()) as ApiList<ActivityScheduleDTO>;
      const mapped = scBody.data
        .sort((a, b) => a.order_in_day - b.order_in_day)
        .map((row) => mapScheduleToSlotVM(row, canEditAll));
      setSlots(mapped);
      // Local conflict best-effort
      setConflicts(detectLocalConflicts(mapped));
    } catch (e: any) {
      setError(e?.message || "Błąd ładowania danych");
    } finally {
      setLoading(false);
    }
  }, [campDayId, canEditAll, initialCampDay]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalMinutes = React.useMemo(() => {
    return slots.reduce((acc, s) => acc + Math.max(0, minutesBetween(s.startTime, s.endTime)), 0);
  }, [slots]);

  return { campDay, slots, totalMinutes, conflicts, loading, error, refresh: fetchAll, setSlots };
}

function detectLocalConflicts(slots: SlotVM[]): ConflictMessage[] {
  const messages: ConflictMessage[] = [];
  // Order uniqueness
  const orders = new Map<number, number>();
  for (const s of slots) {
    orders.set(s.orderInDay, (orders.get(s.orderInDay) ?? 0) + 1);
  }
  for (const [order, count] of orders.entries()) {
    if (count > 1) {
      messages.push({ type: "order", detail: `Powielona kolejność: ${order}` });
    }
  }
  // Time overlaps (best-effort)
  const byStart = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < byStart.length; i++) {
    const prev = byStart[i - 1];
    const curr = byStart[i];
    if (curr.startTime < prev.endTime) {
      messages.push({
        type: "overlap",
        detail: `Nakładanie czasów między slotami ${prev.orderInDay} i ${curr.orderInDay}`,
      });
    }
  }
  return messages;
}
