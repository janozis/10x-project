import * as React from "react";
import { useGroups } from "@/lib/groups/useGroups";
import type { GroupDTO } from "@/types";
import type { GroupCardVM } from "@/lib/groups/types";
import { mapGroupToCardVM } from "@/lib/groups/mappers";
import { GroupsHeader } from "./GroupsHeader";
import { GroupsGrid } from "./GroupsGrid";
import { EmptyState } from "./EmptyState";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { JoinGroupDialog } from "./JoinGroupDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { useDeleteGroup } from "@/lib/groups/useDeleteGroup";
import { useRestoreGroup } from "@/lib/groups/useRestoreGroup";
import { toast } from "sonner";

export default function GroupsView(): JSX.Element {
  const [tab, setTab] = React.useState<"active" | "deleted">("active");
  const { loading, error, errorCode, errorStatus, items, refresh, mutate, hasMore, loadMore, loadingMore } = useGroups({ showDeleted: tab === "deleted", limit: 12 });

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openJoin, setOpenJoin] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{ type: "delete" | "restore"; id: string } | null>(null);

  const { remove, loading: removing, error: removeError } = useDeleteGroup();
  const { restore, loading: restoring, error: restoreError } = useRestoreGroup();

  const [success, setSuccess] = React.useState<string | null>(null);
  const liveRef = React.useRef<HTMLDivElement | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [restoredRecent, setRestoredRecent] = React.useState<GroupDTO | null>(null);
  React.useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        liveRef.current?.focus();
      }, 0);
      const clear = setTimeout(() => setSuccess(null), 4000);
      return () => {
        clearTimeout(t);
        clearTimeout(clear);
      };
    }
  }, [success]);

  const vms: GroupCardVM[] = React.useMemo(() => items.map(mapGroupToCardVM), [items]);

  const total = vms.length;

  const handleOpenCreate = React.useCallback(() => setOpenCreate(true), []);
  const handleOpenJoin = React.useCallback(() => setOpenJoin(true), []);
  const handleTabChange = React.useCallback((t: "active" | "deleted") => {
    setTab(t);
    if (t === "active" && restoredRecent) {
      mutate((prev) => (prev.some((g) => g.id === restoredRecent.id) ? prev : [restoredRecent, ...prev]));
      setRestoredRecent(null);
    }
  }, [mutate, restoredRecent]);
  const handleCopyInvite = React.useCallback(() => setSuccess("Skopiowano kod zaproszenia."), []);
  const handleRequestDelete = React.useCallback((id: string) => setConfirm({ type: "delete", id }), []);
  const handleRequestRestore = React.useCallback((id: string) => setConfirm({ type: "restore", id }), []);

  return (
    <section aria-busy={loading} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <GroupsHeader
          total={total}
          onOpenCreate={handleOpenCreate}
          onOpenJoin={handleOpenJoin}
          tab={tab}
          onTabChange={handleTabChange}
        />
        {/* Inline live region for errors or info */}
        <div aria-live="polite" className="sr-only" data-testid="groups-live-region">
          {loading ? "Ładowanie listy grup…" : undefined}
          {error ? `Błąd: ${error}` : undefined}
        </div>
        {success ? (
          <div
            ref={liveRef}
            role="status"
            tabIndex={-1}
            className="rounded-md border border-emerald-400/40 bg-emerald-400/10 text-emerald-700 p-3 text-sm outline-none"
          >
            {success}
          </div>
        ) : null}
        {error ? (
          errorCode === "UNAUTHORIZED" || errorStatus === 401 ? (
            <div role="alert" className="rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-700 p-3 text-sm">
              Aby zobaczyć swoje grupy, zaloguj się.
              <a href="/login?redirect=/groups" className="ml-2 underline">Zaloguj się</a>
            </div>
          ) : (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm">
              Wystąpił błąd podczas ładowania listy grup. Spróbuj ponownie.
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => refresh()}
              >
                Odśwież
              </button>
            </div>
          )
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          variant={tab === "deleted" ? "deleted" : "default"}
          onOpenCreate={handleOpenCreate}
          onOpenJoin={handleOpenJoin}
        />
      ) : (
        <GroupsGrid
          items={vms}
          onDelete={handleRequestDelete}
          onRestore={handleRequestRestore}
          onCopyInvite={handleCopyInvite}
          focusId={focusId}
        />
      )}
      {loadingMore ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="mt-2 px-4 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
            onClick={() => { void loadMore(); }}
          >
            Załaduj więcej
          </button>
        </div>
      ) : null}

      <CreateGroupDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={(group: GroupDTO) => {
          setSuccess("Grupa została utworzona.");
          toast.success("Grupa została utworzona.");
          if (tab === "active" && !group.deleted_at) {
            mutate((prev) => [group, ...prev]);
          }
          setFocusId(group.id);
          window.setTimeout(() => setFocusId(null), 4000);
          void refresh();
        }}
      />
      <JoinGroupDialog
        open={openJoin}
        onOpenChange={setOpenJoin}
        onJoined={() => {
          setSuccess("Dołączono do grupy.");
          toast.success("Dołączono do grupy.");
          void refresh();
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.type === "delete" ? "Usuń grupę" : "Przywróć grupę"}
        description={confirm?.type === "delete" ? "Czy na pewno chcesz usunąć tę grupę?" : "Czy na pewno chcesz przywrócić tę grupę?"}
        confirmText={confirm?.type === "delete" ? "Usuń" : "Przywróć"}
        variant={confirm?.type === "delete" ? "destructive" : "default"}
        loading={confirm?.type === "delete" ? removing : restoring}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.type === "delete") {
            const res = await remove(confirm.id);
            if (res.ok) {
              setConfirm(null);
              setSuccess("Grupa została usunięta.");
              toast.success("Grupa została usunięta.");
              mutate((prev) => prev.filter((g) => g.id !== confirm.id));
              await refresh();
            }
          } else {
            const res = await restore(confirm.id);
            if (res.ok) {
              setConfirm(null);
              setSuccess("Grupa została przywrócona.");
              toast.success("Grupa została przywrócona.");
              if (tab === "deleted") {
                // Remove from deleted list; if server returns the restored group data, we could insert into active list when tab switches
                mutate((prev) => prev.filter((g) => g.id !== confirm.id));
                if (res.data) setRestoredRecent(res.data);
              }
              if (tab === "active" && res.data) {
                mutate((prev) => (prev.some((g) => g.id === res.data!.id) ? prev : [res.data!, ...prev]));
                setFocusId(res.data.id);
                window.setTimeout(() => setFocusId(null), 4000);
              }
              await refresh();
            }
          }
        }}
      />

      {(removeError || restoreError) ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm">
          {removeError || restoreError}
        </div>
      ) : null}
    </section>
  );
}


