import * as React from "react";

export function LoadingSkeleton({ rows = 4 }: { rows?: number }): JSX.Element {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-md border p-3">
          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-44 rounded bg-muted animate-pulse" />
        </li>
      ))}
    </ul>
  );
}
