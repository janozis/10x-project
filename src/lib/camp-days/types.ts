export type ConflictType = "overlap" | "order" | "api";

export interface ConflictMessage {
  type: ConflictType;
  detail: string;
  scheduleId?: string;
}

import type { TimeHHMM, UUID, ActivityScheduleDTO } from "@/types";

export type ActivityStatus = "draft" | "review" | "ready" | "archived";

export interface ActivitySummaryVM {
  id: UUID;
  title: string;
  status: ActivityStatus;
}

export interface SlotVM {
  id: UUID;
  activityId: UUID;
  campDayId: UUID;
  startTime: TimeHHMM;
  endTime: TimeHHMM;
  orderInDay: number;
  activity?: ActivitySummaryVM;
  canEdit: boolean;
}

export function mapScheduleToSlotVM(row: ActivityScheduleDTO, canEdit: boolean): SlotVM {
  return {
    id: row.id,
    activityId: row.activity_id,
    campDayId: row.camp_day_id,
    startTime: row.start_time,
    endTime: row.end_time,
    orderInDay: row.order_in_day,
    canEdit,
  };
}

export function minutesBetween(start: TimeHHMM, end: TimeHHMM): number {
  const [sh, sm] = start.split(":").map((x) => parseInt(x, 10));
  const [eh, em] = end.split(":").map((x) => parseInt(x, 10));
  return eh * 60 + em - (sh * 60 + sm);
}

export function isValidTimeString(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map((x) => parseInt(x, 10));
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

export function addMinutes(time: TimeHHMM, minutes: number): TimeHHMM {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + minutes));
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}` as TimeHHMM;
}
