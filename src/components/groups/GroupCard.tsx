import * as React from "react";
import type { GroupCardVM } from "@/lib/groups/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface GroupCardProps {
  item: GroupCardVM;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onCopyInvite?: (code: string) => void;
  focusMe?: boolean;
}

function GroupCardComponent({ item, onDelete, onRestore, onCopyInvite, focusMe }: GroupCardProps): JSX.Element {
  const canRestore = item.isArchived;
  const inviteCode = item.inviteCode ?? undefined;

  const statusVariant = React.useMemo((): "default" | "secondary" | "destructive" | "outline" => {
    switch (item.status) {
      case "active":
        return "default";
      case "planning":
        return "secondary";
      case "archived":
        return "outline";
      default:
        return "secondary";
    }
  }, [item.status]);

  const cardRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (focusMe && cardRef.current) {
      try {
        cardRef.current.focus();
      } catch {
        // ignore
      }
    }
  }, [focusMe]);

  const handleCardClick = React.useCallback((e: React.MouseEvent) => {
    // Prevent navigation if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    // Navigate to group dashboard
    window.location.href = `/groups/${item.id}/dashboard`;
  }, [item.id]);

  return (
    <Card 
      ref={cardRef} 
      tabIndex={focusMe ? -1 : undefined}
      className="cursor-pointer transition-colors hover:bg-accent/40"
      onClick={handleCardClick}
      data-test-id="groups-list-card"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate" title={item.name}>
              {item.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate" title={item.loreTheme}>
              {item.loreTheme}
            </p>
          </div>
          <Badge variant={statusVariant}>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="text-sm grid grid-cols-1 gap-1">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Okres</dt>
            <dd>{item.periodLabel}</dd>
          </div>
          {typeof item.maxMembers === "number" ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Limit</dt>
              <dd>{item.maxMembers}</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
      {(inviteCode || canRestore) ? (
        <CardFooter className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {inviteCode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await navigator.clipboard.writeText(inviteCode);
                    onCopyInvite?.(inviteCode);
                  } catch {
                    // Ignore silently
                  }
                }}
                data-test-id="groups-card-copy-invite-button"
              >
                Kopiuj kod
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {canRestore ? (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore?.(item.id);
                }}
                data-test-id="groups-card-restore-button"
              >
                Przywróć
              </Button>
            ) : null}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export const GroupCard = React.memo(GroupCardComponent, (prev, next) => {
  const a = prev.item;
  const b = next.item;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.loreTheme === b.loreTheme &&
    a.status === b.status &&
    a.periodLabel === b.periodLabel &&
    a.maxMembers === b.maxMembers &&
    a.inviteCode === b.inviteCode &&
    a.isArchived === b.isArchived &&
    prev.focusMe === next.focusMe &&
    prev.onDelete === next.onDelete &&
    prev.onRestore === next.onRestore &&
    prev.onCopyInvite === next.onCopyInvite
  );
});
