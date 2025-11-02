import * as React from "react";
import type { CampDayDTO } from "@/types";

export interface DayHeaderProps {
  campDay: CampDayDTO;
  totalMinutes: number;
}

const DayHeaderComponent = ({ campDay, totalMinutes }: DayHeaderProps): JSX.Element => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Dzień {campDay.day_number}</h2>
        <p className="text-sm text-muted-foreground">Data: {campDay.date}{campDay.theme ? ` • Motyw: ${campDay.theme}` : ""}</p>
      </div>
      <div className="text-sm text-muted-foreground">Suma czasu: {totalMinutes} min</div>
    </div>
  );
};

export const DayHeader = React.memo(DayHeaderComponent);


