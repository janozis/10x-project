import * as React from "react";
import { ArrowLeft, CalendarDays, Edit3, Trash2 } from "lucide-react";

import { DeleteCampDayButton } from "@/components/camp-days/DeleteCampDayButton";
import type { UUID } from "@/types";
import { Button } from "@/components/ui/button";

export interface CampDayPageActionsProps {
  groupId: UUID;
  campDayId: UUID;
  canDelete: boolean;
  canEdit?: boolean;
}

export function CampDayPageActions({
  groupId,
  campDayId,
  canDelete,
  canEdit = false,
}: CampDayPageActionsProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <a href={`/groups/${groupId}/dashboard`} aria-label="Wróć do pulpitu grupy">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Pulpit grupy
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <a href={`/groups/${groupId}/camp-days`} aria-label="Lista dni obozu">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Lista dni obozu
          </a>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`/groups/${groupId}/camp-days/${campDayId}/edit`} aria-label="Edytuj dzień">
              <Edit3 className="size-3.5" aria-hidden="true" />
              Edytuj dzień
            </a>
          </Button>
        ) : null}
        {canDelete ? (
          <DeleteCampDayButton
            groupId={groupId}
            campDayId={campDayId}
            canDelete={canDelete}
            mode="details"
            size="sm"
            className="gap-1.5"
            label="Usuń dzień"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Usuń dzień
          </DeleteCampDayButton>
        ) : null}
      </div>
    </div>
  );
}
