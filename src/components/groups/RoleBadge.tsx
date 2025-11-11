import * as React from "react";
import type { GroupRole } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface RoleBadgeProps {
  role: GroupRole;
}

function variantFor(role: GroupRole): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "admin":
      return "default";
    case "editor":
      return "secondary";
    case "member":
    default:
      return "outline";
  }
}

export function RoleBadge({ role }: RoleBadgeProps): JSX.Element {
  return (
    <Badge variant={variantFor(role)} className="capitalize">
      {role}
    </Badge>
  );
}
