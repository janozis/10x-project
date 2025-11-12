import * as React from "react";
import type { UUID } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  groupId: UUID;
  isDeleted: boolean;
  canManage: boolean;
  onDelete: () => void;
  onRestore: () => void;
}

export function DangerZoneCard({ isDeleted, canManage, onDelete, onRestore }: Props): JSX.Element | null {
  if (!canManage) return null;
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="mb-2 text-sm font-medium text-destructive">Niebezpieczne akcje</div>
      {isDeleted ? (
        <div className="flex items-center justify-between">
          <p className="text-sm">Grupa jest usunięta. Możesz ją przywrócić.</p>
          <Button type="button" variant="default" onClick={onRestore}>
            Przywróć grupę
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm">Usunięcie spowoduje ukrycie grupy dla użytkowników. Możliwe będzie przywrócenie.</p>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Usuń grupę
          </Button>
        </div>
      )}
    </div>
  );
}
