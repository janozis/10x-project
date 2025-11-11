import * as React from "react";
import type { RealtimeStatus } from "@/lib/dashboard/activity-feed.types";

export function LiveIndicator({ status }: { status: RealtimeStatus }): JSX.Element {
  const color =
    status === "live" ? "bg-emerald-500" : status === "reconnecting" ? "bg-amber-500" : "bg-muted-foreground/50";
  const label = status === "live" ? "LIVE" : status === "reconnecting" ? "RECONNECTING" : "OFF";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
      <span aria-label={`Realtime status: ${label}`}>{label}</span>
    </span>
  );
}
