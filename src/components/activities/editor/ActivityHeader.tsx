import * as React from "react";
import type { ActivityStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ActivityHeaderProps {
  title?: string;
  status?: ActivityStatus;
  isDirty?: boolean;
  canEdit?: boolean;
  saving?: boolean;
  requestingAI?: boolean;
  cooldownSec?: number;
  onSave?: () => void | Promise<void>;
  onRequestAI?: () => void | Promise<void>;
}

export function ActivityHeader({ title = "Edytor aktywności", status = "draft", isDirty = false, canEdit = true, saving = false, requestingAI = false, cooldownSec = 0, onSave, onRequestAI, }: ActivityHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge variant="secondary">{status}</Badge>
        {isDirty ? <span className="text-xs text-amber-600">Niezapisane zmiany</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" disabled={!canEdit || requestingAI || (cooldownSec ?? 0) > 0} onClick={() => { void onRequestAI?.(); }}>
          {requestingAI ? "Żądanie…" : (cooldownSec && cooldownSec > 0 ? `AI za ${cooldownSec}s` : "Poproś o ocenę AI")}
        </Button>
        <Button type="button" disabled={!canEdit || !isDirty || saving} onClick={() => { void onSave?.(); }}>
          {saving ? "Zapisywanie…" : "Zapisz"}
        </Button>
      </div>
    </div>
  );
}


