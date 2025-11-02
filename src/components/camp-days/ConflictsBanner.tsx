import * as React from "react";
import type { ConflictMessage } from "@/lib/camp-days/types";

export interface ConflictsBannerProps {
  conflicts: ConflictMessage[];
}

const ConflictsBannerComponent = ({ conflicts }: ConflictsBannerProps): JSX.Element | null => {
  if (!conflicts?.length) return null;
  return (
    <div role="alert" className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-900 dark:text-yellow-100 p-3 text-sm">
      <ul className="list-disc ml-5">
        {conflicts.map((c, i) => (
          <li key={`${c.type}-${c.scheduleId ?? ""}-${i}`}>{c.detail}</li>
        ))}
      </ul>
    </div>
  );
};

export const ConflictsBanner = React.memo(ConflictsBannerComponent);


