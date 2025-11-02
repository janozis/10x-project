import * as React from "react";

export interface CampDaysSkeletonProps {
  rows?: number;
}

export function CampDaysSkeleton({ rows = 6 }: CampDaysSkeletonProps): React.ReactElement {
  const items = React.useMemo(() => Array.from({ length: rows }), [rows]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
      {items.map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-xl border border-border/50 bg-muted/40" aria-hidden="true" />
      ))}
    </div>
  );
}


