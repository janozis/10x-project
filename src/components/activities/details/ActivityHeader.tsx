import * as React from "react";
import type { ActivityDTO, AIEvaluationDTO } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface ActivityHeaderProps {
  activity?: ActivityDTO;
  latestEvaluation: AIEvaluationDTO | null;
  loading?: boolean;
}

export function ActivityHeader({ activity, latestEvaluation, loading }: ActivityHeaderProps) {
  if (loading) {
    return <div className="h-6 w-48 rounded bg-muted animate-pulse" />;
  }
  if (!activity) {
    return <div className="text-sm text-muted-foreground">Nie znaleziono aktywności.</div>;
  }

  const isStale = latestEvaluation ? new Date(latestEvaluation.created_at) < new Date(activity.updated_at) : false;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h2 className="text-xl font-semibold leading-none tracking-tight">{activity.title}</h2>
      <Badge variant="outline">{activity.status}</Badge>
      {isStale ? <Badge variant="destructive">nieaktualna</Badge> : null}
      <span className="text-sm text-muted-foreground">
        Ostatnio edytowano: {new Date(activity.updated_at).toLocaleString()}
      </span>
    </div>
  );
}
