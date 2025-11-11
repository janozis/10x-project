import * as React from "react";
import { Button } from "@/components/ui/button";

export interface MemberActionsProps {
  canPromote: boolean;
  canRemove: boolean;
  isSelf: boolean;
  onPromote: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  promoteDisabledReason?: string;
  removeDisabledReason?: string;
}

export function MemberActions({ canPromote, canRemove, isSelf, onPromote, onRemove, promoteDisabledReason, removeDisabledReason }: MemberActionsProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={() => { if (canPromote) void onPromote(); }}
        disabled={!canPromote}
        aria-disabled={!canPromote}
        title={!canPromote ? promoteDisabledReason || "Brak uprawnień (tylko administrator)" : undefined}
        data-test-id="members-promote-button"
      >
        Promuj do admina
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { if (canRemove) void onRemove(); }}
        disabled={!canRemove}
        aria-disabled={!canRemove}
        title={!canRemove ? removeDisabledReason || "Brak uprawnień" : undefined}
        aria-label={isSelf ? "Opuść grupę" : "Usuń członka"}
        data-test-id="members-remove-button"
      >
        {isSelf ? "Opuść" : "Usuń"}
      </Button>
    </div>
  );
}


