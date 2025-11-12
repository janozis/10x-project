import * as React from "react";
import type { GroupStatus } from "@/types";
import { Button } from "@/components/ui/button";

interface ArchivedBannerProps {
  status?: GroupStatus;
  deletedAt?: string | null;
  canManage?: boolean;
  onRestore?: () => void;
}

export function ArchivedBanner({ status, deletedAt, canManage, onRestore }: ArchivedBannerProps): JSX.Element | null {
  if (deletedAt) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center justify-between"
      >
        <span>Ta grupa została usunięta. Dostęp jest ograniczony.</span>
        {canManage ? (
          <Button type="button" size="sm" onClick={onRestore}>
            Przywróć
          </Button>
        ) : null}
      </div>
    );
  }
  if (status !== "archived") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-800 px-4 py-3 text-sm"
    >
      Ta grupa jest zarchiwizowana. Akcje edycyjne są ograniczone.
    </div>
  );
}
