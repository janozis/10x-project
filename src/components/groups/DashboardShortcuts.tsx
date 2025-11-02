import * as React from "react";
import type { GroupPermissionsDTO, UUID } from "@/types";
import { Button } from "@/components/ui/button";

interface DashboardShortcutsProps {
  groupId: UUID;
  permissions?: GroupPermissionsDTO | null;
}

export function DashboardShortcuts({ groupId, permissions }: DashboardShortcutsProps): JSX.Element {
  const role = permissions?.role;
  const canManage = role === "admin" || role === "editor";

  return (
    <nav aria-label="Skróty" className="my-4 flex flex-wrap gap-2">
      <a href={`/groups/${groupId}/activities`}>
        <Button variant="outline" size="sm">Zajęcia</Button>
      </a>
      <a href={`/groups/${groupId}/tasks`}>
        <Button variant="outline" size="sm">Zadania</Button>
      </a>
      <a href={`/groups/${groupId}/camp-days`}>
        <Button variant="outline" size="sm">Struktura dnia</Button>
      </a>
      {canManage ? (
        <a href={`/groups/${groupId}/settings`}>
          <Button variant="secondary" size="sm">Ustawienia</Button>
        </a>
      ) : null}
    </nav>
  );
}


