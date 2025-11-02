import * as React from "react";
import type { ActivityWithEditorsDTO } from "@/types";
import type { ColumnVisibilityState } from "@/lib/groups/useColumnPreferences";
import { AIChips } from "@/components/activities/AIChips";
import { EditorsAvatarGroup } from "@/components/activities/EditorsAvatarGroup";
import { RowActionsMenu } from "@/components/activities/RowActionsMenu";

interface ActivitiesTableProps {
  items: ActivityWithEditorsDTO[];
  visible: ColumnVisibilityState;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  mode?: "active" | "deleted";
  canEdit?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  onRequestEdit?: (id: string) => void;
  onRequestDelete?: (id: string) => void;
  onRequestRestore?: (id: string) => void;
}

export function ActivitiesTable({ items, visible, selectable, selectedIds, onToggleSelect, mode = "active", canEdit = false, canDelete = false, canRestore = false, onRequestEdit, onRequestDelete, onRequestRestore }: ActivitiesTableProps): JSX.Element {
  return (
    <div role="table" className="w-full border rounded-md overflow-hidden">
      <div role="row" className="grid grid-cols-12 bg-muted text-xs font-medium px-3 py-2">
        {visible.title ? <div role="columnheader" className="col-span-5">Tytuł</div> : null}
        {visible.objective ? <div role="columnheader" className="col-span-3">Cel</div> : null}
        {visible.ai ? <div role="columnheader" className="col-span-1">AI</div> : null}
        {visible.editors ? <div role="columnheader" className="col-span-2">Edytorzy</div> : null}
        {visible.updated_at ? <div role="columnheader" className="col-span-1">Aktualizacja</div> : null}
      </div>

      <div>
        {items.map((it) => (
          <div 
            key={it.id} 
            role="row" 
            className="grid grid-cols-12 border-t px-3 py-2 text-sm hover:bg-accent/40 group cursor-pointer"
            onClick={(e) => {
              // Prevent row click if clicking on checkbox or action menu
              const target = e.target as HTMLElement;
              if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                return;
              }
              if (canEdit) {
                onRequestEdit?.(it.id);
              }
            }}
          >
            {visible.title ? (
              <div role="cell" className="col-span-5 font-medium truncate flex items-center gap-2">
                {selectable ? (
                  <input
                    type="checkbox"
                    aria-label="Zaznacz aktywność"
                    className="hidden lg:block flex-shrink-0"
                    checked={!!selectedIds?.has(it.id)}
                    onChange={() => onToggleSelect?.(it.id)}
                  />
                ) : null}
                <span className="truncate text-left">
                  {it.title}
                </span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <RowActionsMenu
                    mode={mode}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canRestore={canRestore}
                    onEdit={() => onRequestEdit?.(it.id)}
                    onDelete={() => onRequestDelete?.(it.id)}
                    onRestore={() => onRequestRestore?.(it.id)}
                  />
                </div>
              </div>
            ) : null}
            {visible.objective ? (
              <div role="cell" className="col-span-3 text-muted-foreground line-clamp-2">
                {it.objective}
              </div>
            ) : null}
            {visible.ai ? (
              <div role="cell" className="col-span-1 text-muted-foreground">
                <AIChips 
                  lore={it.latest_ai_evaluation?.lore_score} 
                  scouting={it.latest_ai_evaluation?.scouting_values_score} 
                />
              </div>
            ) : null}
            {visible.editors ? (
              <div role="cell" className="col-span-2 text-muted-foreground">
                <EditorsAvatarGroup userIds={(it.editors || []).map((e) => e.user_id)} />
              </div>
            ) : null}
            {visible.updated_at ? (
              <div role="cell" className="col-span-1 text-muted-foreground">
                {formatDate(it.updated_at)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat(undefined, { year: "2-digit", month: "2-digit", day: "2-digit" }).format(dt);
  } catch {
    return "";
  }
}


