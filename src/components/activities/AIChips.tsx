import * as React from "react";

interface AIChipsProps {
  lore?: number | null;
  scouting?: number | null;
}

function scoreColor(v: number): string {
  if (v > 7) return "bg-emerald-500/15 text-emerald-700";
  if (v >= 5) return "bg-amber-500/15 text-amber-700";
  return "bg-destructive/15 text-destructive";
}

export function AIChips({ lore, scouting }: AIChipsProps): JSX.Element {
  const hasLore = typeof lore === "number";
  const hasScouting = typeof scouting === "number";
  if (!hasLore && !hasScouting) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs text-muted-foreground">
        Brak oceny
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {hasLore && lore !== null && lore !== undefined ? (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${scoreColor(lore)}`}
        >
          LORE {lore}
        </span>
      ) : null}
      {hasScouting && scouting !== null && scouting !== undefined ? (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${scoreColor(scouting)}`}
        >
          SCOUT {scouting}
        </span>
      ) : null}
    </div>
  );
}
