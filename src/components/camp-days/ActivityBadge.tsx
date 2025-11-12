import * as React from "react";
import { Badge } from "@/components/ui/badge";

export interface ActivityBadgeProps {
  title?: string;
  status?: "draft" | "review" | "ready" | "archived";
}

export function ActivityBadge({ title, status }: ActivityBadgeProps): JSX.Element {
  const variant =
    status === "ready" ? "default" : status === "review" ? "secondary" : status === "draft" ? "outline" : "destructive";
  return <Badge variant={variant as any}>{title ?? "Aktywność"}</Badge>;
}
