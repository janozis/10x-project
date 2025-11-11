import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { CampDayListItemVM } from "./types";
import { CampDayMetrics } from "./CampDayMetrics";

export interface CampDayCardProps {
  item: CampDayListItemVM;
  onOpen: () => void;
  isHighlighted?: boolean;
}

export function CampDayCard({
  item,
  onOpen,
  isHighlighted = false,
}: CampDayCardProps): React.ReactElement {
  const labelId = React.useId();

  const handleCardClick = React.useCallback((e: React.MouseEvent) => {
    // Prevent navigation if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    onOpen();
  }, [onOpen]);

  return (
    <Card
      role="group"
      aria-labelledby={labelId}
      className={cn(
        "flex h-full flex-col justify-between border-border/70 transition hover:border-primary/60 hover:shadow-md focus-within:border-primary cursor-pointer",
        "bg-card/90",
        isHighlighted ? "ring-2 ring-primary/60" : undefined
      )}
      onClick={handleCardClick}
      data-test-id="camp-day-card"
    >
      <CardHeader className="flex flex-col gap-4 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dzień {item.dayNumber}
          </span>
          {item.date ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              <span>{formatDate(item.date)}</span>
            </div>
          ) : null}
        </div>

        <CardTitle id={labelId} className="text-xl">
          {item.theme?.trim() || `Dzień ${item.dayNumber}`}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <CampDayMetrics slotsCount={item.slotsCount} totalMinutes={item.totalMinutes} />
      </CardContent>
    </Card>
  );
}

function formatDate(date: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formatter.format(new Date(date));
  } catch {
    return date;
  }
}
