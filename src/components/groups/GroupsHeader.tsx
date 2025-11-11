import * as React from "react";
import { Button } from "@/components/ui/button";

export interface GroupsHeaderProps {
  total: number;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  tab: "active" | "deleted";
  onTabChange: (tab: "active" | "deleted") => void;
}

const GroupsHeaderComponent = ({ total, onOpenCreate, onOpenJoin, tab, onTabChange }: GroupsHeaderProps): JSX.Element => {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Twoje grupy</h1>
        <p className="text-sm text-muted-foreground">Łącznie: {total}</p>
        <div role="tablist" aria-label="Zakładki listy" className="mt-3 inline-flex rounded-md border p-1">
          <button
            role="tab"
            aria-selected={tab === "active"}
            className={`px-3 py-1.5 text-sm rounded-md ${tab === "active" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onTabChange("active")}
            type="button"
            data-test-id="groups-header-tab-active"
          >
            Aktywne
          </button>
          <button
            role="tab"
            aria-selected={tab === "deleted"}
            className={`px-3 py-1.5 text-sm rounded-md ${tab === "deleted" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onTabChange("deleted")}
            type="button"
            data-test-id="groups-header-tab-deleted"
          >
            Ostatnio usunięte
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onOpenJoin} data-test-id="groups-header-join-button">Dołącz do grupy</Button>
        <Button onClick={onOpenCreate} data-test-id="groups-header-create-button">Utwórz grupę</Button>
      </div>
    </header>
  );
}

export const GroupsHeader = React.memo(GroupsHeaderComponent);


