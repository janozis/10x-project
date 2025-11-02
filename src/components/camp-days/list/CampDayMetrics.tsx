import * as React from "react";
import { Clock, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export interface CampDayMetricsProps {
  slotsCount: number;
  totalMinutes: number;
}

export function CampDayMetrics({ slotsCount, totalMinutes }: CampDayMetricsProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Metryki dnia">
      <Badge variant="secondary" className="flex items-center gap-1.5">
        <ListChecks className="size-3.5" aria-hidden="true" />
        <span className="font-medium">{slotsCount}</span>
        <span className="text-[11px] uppercase tracking-wide text-secondary-foreground/70">sloty</span>
      </Badge>
      <Badge variant="outline" className="flex items-center gap-1.5">
        <Clock className="size-3.5" aria-hidden="true" />
        <span className="font-medium">{formatMinutes(totalMinutes)}</span>
      </Badge>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${rest} min`;
}


