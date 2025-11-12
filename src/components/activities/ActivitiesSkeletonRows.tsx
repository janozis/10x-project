import * as React from "react";
import type { ColumnVisibilityState } from "@/lib/groups/useColumnPreferences";

interface ActivitiesSkeletonRowsProps {
  visible: ColumnVisibilityState;
  rows?: number;
}

export function ActivitiesSkeletonRows({ visible, rows = 5 }: ActivitiesSkeletonRowsProps): JSX.Element {
  return (
    <div className="border rounded-md overflow-hidden">
      <div role="rowgroup">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} role="row" className="grid grid-cols-12 border-t first:border-t-0 px-3 py-2">
            {visible.title ? (
              <div role="cell" className="col-span-5">
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </div>
            ) : null}
            {visible.objective ? (
              <div role="cell" className="col-span-3">
                <div className="h-4 w-64 bg-muted animate-pulse rounded" />
              </div>
            ) : null}
            {visible.ai ? (
              <div role="cell" className="col-span-1">
                <div className="h-4 w-10 bg-muted animate-pulse rounded" />
              </div>
            ) : null}
            {visible.editors ? (
              <div role="cell" className="col-span-2">
                <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
              </div>
            ) : null}
            {visible.updated_at ? (
              <div role="cell" className="col-span-1">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
