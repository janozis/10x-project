import * as React from "react";
import { Button } from "@/components/ui/button";
import { Countdown } from "./Countdown";

export interface ActionsBarProps {
  canEdit: boolean;
  canRequest: boolean;
  cooldownRemainingSec: number;
  onRequestEvaluation: () => Promise<void>;
  editHref?: string;
}

export function ActionsBar({ canEdit, canRequest, cooldownRemainingSec, onRequestEvaluation, editHref }: ActionsBarProps) {
  const [requesting, setRequesting] = React.useState(false);

  const handleRequest = async () => {
    if (!canRequest || requesting || cooldownRemainingSec > 0) return;
    setRequesting(true);
    try {
      await onRequestEvaluation();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
      <Button asChild variant="secondary" disabled={!canEdit} aria-disabled={!canEdit}>
        <a
          href={editHref || "#"}
          onClick={(e) => { if (!canEdit || !editHref) { e.preventDefault(); } }}
          aria-label={!canEdit ? "Brak uprawnień do edycji" : undefined}
          title={!canEdit ? "Brak uprawnień do edycji" : undefined}
        >
          Edytuj
        </a>
      </Button>
      <Button
        onClick={handleRequest}
        disabled={!canRequest || requesting || cooldownRemainingSec > 0}
        aria-disabled={!canRequest || requesting || cooldownRemainingSec > 0}
        title={!canRequest ? "Brak uprawnień do tej akcji" : cooldownRemainingSec > 0 ? "Odczekaj do końca cooldownu" : undefined}
      >
        {requesting ? "Kolejkowanie…" : "Poproś o ocenę AI"}
      </Button>
      </div>
      {cooldownRemainingSec > 0 ? (
        <span className="text-sm text-muted-foreground">Odczekaj <Countdown seconds={cooldownRemainingSec} /></span>
      ) : null}
      {!canEdit ? (
        <span className="text-xs text-muted-foreground">Brak uprawnień do edycji.</span>
      ) : null}
      {!canRequest && cooldownRemainingSec === 0 ? (
        <span className="text-xs text-muted-foreground">Brak uprawnień do żądania oceny AI.</span>
      ) : null}
    </div>
  );
}


