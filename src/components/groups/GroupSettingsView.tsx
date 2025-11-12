import * as React from "react";
import type { GroupDTO, GroupPermissionsDTO, UUID } from "@/types";
import { useGroupSettings } from "@/lib/useGroupSettings";
import { ArchivedBanner } from "@/components/groups/ArchivedBanner";
import { GroupDetailsForm } from "@/components/groups/GroupDetailsForm";
import { InviteCard } from "@/components/groups/InviteCard";
import { DangerZoneCard } from "@/components/groups/DangerZoneCard";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";

interface GroupSettingsViewProps {
  groupId: UUID;
}

export function GroupSettingsView({ groupId }: GroupSettingsViewProps): JSX.Element {
  const {
    loading,
    error,
    group,
    permissions,
    refresh,
    saveDetails,
    toggleArchive,
    rotateInvite,
    cooldownUntil,
    softDelete,
    restore,
  } = useGroupSettings(groupId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<
    "archive" | "unarchive" | "delete" | "restore" | "rotate" | undefined
  >(undefined);
  const isArchived = group?.status === "archived";
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const canManage = React.useMemo(() => permissions?.role === "admin", [permissions]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-8 w-64 rounded-md bg-muted animate-pulse" />
        <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm"
      >
        {error}
        <div className="mt-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-1 text-xs"
            onClick={() => {
              void refresh();
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div role="status" className="text-sm text-muted-foreground">
        Nie udało się załadować danych grupy.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{group.name}</h2>
          <p className="text-sm text-muted-foreground">ID: {group.id}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {permissions ? <span>Twoja rola: {permissions.role}</span> : null}
        </div>
      </header>

      <ArchivedBanner
        status={group.status}
        deletedAt={group.deleted_at}
        canManage={permissions?.role === "admin"}
        onRestore={() => {
          setConfirmAction("restore");
          setConfirmOpen(true);
        }}
      />

      <GroupDetailsForm
        initial={{
          name: group.name,
          description: group.description,
          lore_theme: group.lore_theme,
          start_date: group.start_date,
          end_date: group.end_date,
          max_members: group.max_members ?? undefined,
          status: group.status,
        }}
        canEdit={permissions?.role === "admin"}
        onSave={async (changes) => {
          const ok = await saveDetails(changes);
          if (ok) toast.success("Zapisano zmiany");
          else toast.error("Nie udało się zapisać zmian");
        }}
        onToggleArchive={async () => {
          setConfirmAction(isArchived ? "unarchive" : "archive");
          setConfirmOpen(true);
        }}
      />

      {permissions?.role === "admin" && group.status !== "archived" && !group.deleted_at ? (
        <InviteCard
          groupId={group.id}
          invite={group.invite}
          canManage
          onRequestRotate={() => {
            setConfirmAction("rotate");
            setConfirmOpen(true);
          }}
          cooldownMs={cooldownUntil ? Math.max(0, cooldownUntil - now) : undefined}
        />
      ) : null}

      <DangerZoneCard
        groupId={group.id}
        isDeleted={!!group.deleted_at}
        canManage={permissions?.role === "admin"}
        onDelete={() => {
          setConfirmAction("delete");
          setConfirmOpen(true);
        }}
        onRestore={() => {
          setConfirmAction("restore");
          setConfirmOpen(true);
        }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center rounded-md border px-3 py-1 text-xs"
          onClick={() => {
            void refresh();
          }}
        >
          Odśwież
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setConfirmAction(undefined);
        }}
        title={
          confirmAction === "archive"
            ? "Zarchiwizować grupę?"
            : confirmAction === "unarchive"
              ? "Odarchiwizować grupę?"
              : confirmAction === "delete"
                ? "Usunąć grupę?"
                : confirmAction === "restore"
                  ? "Przywrócić grupę?"
                  : "Zrotować kod zaproszenia?"
        }
        description={
          confirmAction === "archive"
            ? "Ukryje zaproszenia i ograniczy edycję."
            : confirmAction === "unarchive"
              ? "Przywróci możliwość zapraszania i edycji."
              : confirmAction === "delete"
                ? "To działanie można cofnąć przez przywrócenie."
                : confirmAction === "restore"
                  ? "Przywróci dostęp do grupy."
                  : "Zmieni kod zaproszenia – poprzedni przestanie działać."
        }
        confirmText={
          confirmAction === "archive"
            ? "Archiwizuj"
            : confirmAction === "unarchive"
              ? "Odarchiwizuj"
              : confirmAction === "delete"
                ? "Usuń"
                : confirmAction === "restore"
                  ? "Przywróć"
                  : "Rotuj"
        }
        variant={confirmAction === "delete" ? "destructive" : "default"}
        onConfirm={async () => {
          try {
            if (confirmAction === "archive" || confirmAction === "unarchive") {
              const ok = await toggleArchive();
              if (ok) toast.success(confirmAction === "archive" ? "Zarchiwizowano grupę" : "Odarchiwizowano grupę");
              else toast.error("Operacja nie powiodła się");
            } else if (confirmAction === "rotate") {
              const ok = await rotateInvite();
              if (ok) toast.success("Zrotowano kod zaproszenia");
              else toast.error("Nie udało się zrotować kodu");
            } else if (confirmAction === "delete") {
              const ok = await softDelete();
              if (ok) {
                toast.success("Usunięto grupę");
                window.location.href = "/groups";
              } else {
                toast.error("Nie udało się usunąć grupy");
              }
            } else if (confirmAction === "restore") {
              const ok = await restore();
              if (ok) toast.success("Przywrócono grupę");
              else toast.error("Nie udało się przywrócić grupy");
            }
          } finally {
            setConfirmOpen(false);
            setConfirmAction(undefined);
          }
        }}
      />
    </section>
  );
}
