import * as React from "react";
import type { ActivityWithEditorsDTO, UUID } from "@/types";
import { useGroupPermissions } from "@/lib/groups/useGroupPermissions";
import { useColumnPreferences, type ColumnId } from "@/lib/groups/useColumnPreferences";
import { supabaseClient, DEFAULT_USER_ID } from "@/db/supabase.client";
import { ActivitiesToolbar } from "@/components/activities/ActivitiesToolbar";
import { useInfiniteActivities } from "@/lib/activities/useInfiniteActivities";
import { ActivitiesTable } from "@/components/activities/ActivitiesTable";
import { useRealtimeActivities } from "@/lib/activities/useRealtimeActivities";
import { BulkActionsBar } from "@/components/activities/BulkActionsBar";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";
import { deleteActivity, restoreActivity } from "@/lib/activities/api.client";
import { toast } from "sonner";
import { ActivitiesEmptyState } from "@/components/activities/EmptyState";
import { useIntersection } from "@/lib/hooks/useIntersection";
import { ColumnsConfigurator } from "@/components/activities/ColumnsConfigurator";
import { CreateActivityDialog } from "@/components/activities/CreateActivityDialog";

export interface ActivitiesListShellProps {
  groupId: UUID;
}

type Mode = "active" | "deleted";
type ActivityStatus = "draft" | "review" | "ready" | "archived";

interface ActivitiesListFilters {
  status?: ActivityStatus;
  assigned?: "me";
  search?: string;
}

export default function ActivitiesListShell({ groupId }: ActivitiesListShellProps): React.JSX.Element {
  const [userId, setUserId] = React.useState<UUID | undefined>(undefined);
  const [mode, setMode] = React.useState<Mode>("active");
  const {
    permissions,
    loading: loadingPerms,
    error: permsError,
    errorCode: permsErrorCode,
    errorStatus: permsStatus,
  } = useGroupPermissions(groupId);

  // Initialize filters depending on permissions
  // Note: Editor with can_edit_assigned_only can VIEW all activities but can EDIT only assigned ones
  // They can optionally filter by "assigned: me" using the filter UI, but default is to show all
  const [filters, setFilters] = React.useState<ActivitiesListFilters>({});

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!supabaseClient) {
          if (!mounted) return;
          setUserId(DEFAULT_USER_ID);
          return;
        }
        const { data } = await supabaseClient.auth.getUser();
        if (!mounted) return;
        setUserId((data?.user?.id as UUID | undefined) ?? DEFAULT_USER_ID);
      } catch {
        if (!mounted) return;
        setUserId(DEFAULT_USER_ID);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { state: visibleColumns, toggle: toggleColumn, reset: resetColumns } = useColumnPreferences(groupId, userId);

  const isArchived = false; // TODO: wire when group status is available

  const {
    loading: loadingList,
    error: listError,
    errorCode: listErrorCode,
    errorStatus: listErrorStatus,
    items,
    hasMore,
    loadingMore,
    loadMore,
    mutate,
    refresh,
  } = useInfiniteActivities({ groupId, filters, mode, limit: 20 });

  const total = mode === "active" ? items.length : 0;

  // Debug logging
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[ActivitiesListShell] State:", {
        loadingList,
        listError,
        listErrorCode,
        listErrorStatus,
        itemsLength: items.length,
        hasMore,
        loadingMore,
        items: items.slice(0, 2), // First 2 items for preview
      });
    }
  }, [loadingList, listError, listErrorCode, listErrorStatus, items.length, hasMore, loadingMore, items]);

  // Selection (desktop-oriented)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  // Keyboard: Esc clears selection
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedIds.size > 0) {
        clearSelection();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds.size, clearSelection]);

  // Realtime updates
  useRealtimeActivities({
    groupId,
    enabled: mode === "active",
    onUpsert: (item) => {
      // Basic filter matching before inserting new items
      const matchesStatus = !filters.status || item.status === filters.status;
      const q = (filters.search || "").toLowerCase();
      const matchesSearch =
        !q || item.title.toLowerCase().includes(q) || (item.objective || "").toLowerCase().includes(q);
      const matchesAssigned =
        filters.assigned !== "me" || (userId ? item.editors?.some((e) => e.user_id === userId) : false);
      if (!(matchesStatus && matchesSearch && matchesAssigned)) {
        // If item exists in list but no longer matches, remove it
        mutate((prev) => prev.filter((p) => p.id !== item.id));
        return;
      }
      mutate((prev) => {
        const idx = prev.findIndex((p) => p.id === item.id);
        if (idx === -1) return [item, ...prev];
        const copy = prev.slice();
        copy[idx] = item;
        return copy;
      });
    },
    onDelete: (id) => {
      mutate((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Bulk delete
  const [confirm, setConfirm] = React.useState<{ type: "delete" | "restore"; ids: string[] } | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const requestDelete = React.useCallback((ids: string[]) => {
    if (!ids.length) return;
    setConfirm({ type: "delete", ids });
  }, []);
  const requestRestore = React.useCallback((ids: string[]) => {
    if (!ids.length) return;
    setConfirm({ type: "restore", ids });
  }, []);
  const canDelete = permissions?.role === "admin" && mode === "active";
  const canRestore = permissions?.role === "admin" && mode === "deleted";
  const canCreate = permissions?.role === "admin" || permissions?.role === "editor";
  const canEdit = permissions?.role === "admin" || permissions?.role === "editor";

  const handleCreateActivity = React.useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSuccess = React.useCallback(() => {
    setCreateDialogOpen(false);
    void refresh();
    toast.success("Aktywność została utworzona");
  }, [refresh]);

  const handleViewActivity = React.useCallback((activityId: string) => {
    // Navigate to details page
    window.location.href = `/activities/${activityId}`;
  }, []);

  const handleEditActivity = React.useCallback((activityId: string) => {
    // Navigate to edit page
    window.location.href = `/activities/${activityId}/edit`;
  }, []);

  // Infinite scroll sentinel
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const inView = useIntersection(sentinelRef, { root: null, rootMargin: "0px 0px 30% 0px", threshold: 0 });
  React.useEffect(() => {
    if (!inView) return;
    if (!hasMore || loadingMore || loadingList) return;
    void loadMore();
  }, [inView, hasMore, loadingMore, loadingList, loadMore]);

  // Live region for status messages
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const liveRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!statusMsg) return;
    const t = window.setTimeout(() => {
      liveRef.current?.focus();
    }, 0);
    const clear = window.setTimeout(() => setStatusMsg(null), 4000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(clear);
    };
  }, [statusMsg]);

  return (
    <section className="flex flex-col gap-6" aria-busy={loadingPerms}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Aktywności</h1>
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
              {total}
            </span>
          </div>
        </div>

        {permsError ? (
          permsErrorCode === "UNAUTHORIZED" || permsStatus === 401 ? (
            <div
              role="alert"
              className="rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-700 p-3 text-sm"
            >
              Aby zobaczyć aktywności w grupie, zaloguj się.
              <a href="/auth/login" className="ml-2 underline">
                Zaloguj się
              </a>
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm"
            >
              Wystąpił błąd podczas ładowania uprawnień. Spróbuj ponownie.
            </div>
          )
        ) : null}

        {permissions?.role === "member" ? (
          <div role="note" className="rounded-md border border-muted/60 bg-muted/20 text-muted-foreground p-3 text-sm">
            Masz rolę członka. Edycja aktywności jest niedostępna.
          </div>
        ) : null}

        {isArchived ? (
          <div role="note" className="rounded-md border border-muted/60 bg-muted/20 text-muted-foreground p-3 text-sm">
            Grupa jest zarchiwizowana. Akcje modyfikujące są wyłączone.
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Tabs */}
        <div className="inline-flex rounded-md border overflow-hidden" role="tablist" aria-label="Widoki listy">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "active"}
            className={`px-3 py-1.5 text-sm ${mode === "active" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"}`}
            onClick={() => setMode("active")}
          >
            Aktywne
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "deleted"}
            className={`px-3 py-1.5 text-sm border-l ${mode === "deleted" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"}`}
            onClick={() => setMode("deleted")}
          >
            Ostatnio usunięte
          </button>
        </div>

        <div className="ml-auto flex-1" />
      </div>

      {/* Toolbar */}
      <ActivitiesToolbar
        value={filters}
        onChange={setFilters}
        disabled={isArchived}
        showAssigned={permissions?.role !== "admin"}
        canCreate={canCreate && mode === "active"}
        onCreateClick={handleCreateActivity}
        right={
          <ColumnsConfigurator
            state={visibleColumns}
            onToggle={(k) => toggleColumn(k as ColumnId)}
            onReset={resetColumns}
          />
        }
      />

      {/* Bulk actions (desktop) */}
      <BulkActionsBar
        selectedIds={selectedIds}
        mode={mode}
        permissions={permissions}
        onDeleteRequest={requestDelete}
        onRestoreRequest={requestRestore}
        onEditRequest={handleEditActivity}
        onClear={clearSelection}
      />

      {/* Content */}
      {listError ? (
        listErrorCode === "VALIDATION_ERROR" ? (
          <div
            role="alert"
            className="rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-700 p-3 text-sm flex items-center justify-between gap-2"
          >
            <span>Nieprawidłowe filtry. Zresetuj i spróbuj ponownie.</span>
            <button
              type="button"
              className="px-2 py-1 text-xs rounded-md border hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                if (permissions?.role === "editor" && permissions.can_edit_assigned_only)
                  setFilters({ assigned: "me" });
                else setFilters({});
                void refresh();
              }}
            >
              Reset filtrów
            </button>
          </div>
        ) : listErrorStatus === 401 || listErrorCode === "UNAUTHORIZED" ? (
          <div
            role="alert"
            className="rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-700 p-3 text-sm"
          >
            {listError || "Brak autoryzacji."}
            <a href="/auth/login" className="ml-2 underline">
              Zaloguj się
            </a>
          </div>
        ) : listErrorStatus === 500 || listErrorCode === "INTERNAL_ERROR" ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm"
          >
            {listError ||
              "Błąd serwera. Sprawdź konfigurację zmiennych środowiskowych (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY)."}
          </div>
        ) : (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm"
          >
            {listError || "Wystąpił błąd podczas ładowania listy aktywności. Spróbuj ponownie."}
            {import.meta.env.DEV && listErrorCode ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Kod błędu: {listErrorCode}
                {listErrorStatus ? ` (${listErrorStatus})` : ""}
              </div>
            ) : null}
          </div>
        )
      ) : items.length === 0 ? (
        <ActivitiesEmptyState
          canCreate={canCreate}
          reason={filters.search || filters.status || filters.assigned ? "filters" : "empty"}
          onCreateClick={handleCreateActivity}
        />
      ) : (
        <>
          <ActivitiesTable
            items={items}
            visible={visibleColumns}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            mode={mode}
            canEdit={canEdit && mode === "active"}
            canDelete={canDelete}
            canRestore={canRestore}
            onRequestView={handleViewActivity}
            onRequestEdit={handleEditActivity}
            onRequestDelete={(id) => requestDelete([id])}
            onRequestRestore={(id) => requestRestore([id])}
          />
          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                className="mt-2 px-4 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  void loadMore();
                }}
                disabled={loadingMore}
              >
                {loadingMore ? "Ładowanie…" : "Załaduj więcej"}
              </button>
            </div>
          ) : null}
          <div ref={sentinelRef} aria-hidden className="h-2" />
        </>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.type === "restore" ? "Przywróć aktywności" : "Usuń aktywności"}
        description={
          confirm?.type === "restore"
            ? "Czy na pewno chcesz przywrócić zaznaczone aktywności?"
            : "Czy na pewno chcesz usunąć zaznaczone aktywności?"
        }
        confirmText={confirm?.type === "restore" ? "Przywróć" : "Usuń"}
        variant={confirm?.type === "restore" ? "default" : "destructive"}
        loading={processing}
        onConfirm={async () => {
          if (!confirm) return;
          setProcessing(true);
          try {
            const ids = confirm.ids;
            if (confirm.type === "delete") {
              if (!canDelete) return;
              const results = await Promise.all(ids.map(async (id) => deleteActivity(id)));
              const deletedIds = new Set(
                results
                  .filter((r): r is { data: { id: UUID; deleted_at: string } } => "data" in r && !!r.data)
                  .map((r) => r.data.id)
              );

              // Check for errors
              const errors = results.filter((r) => "error" in r);
              if (errors.length > 0 && deletedIds.size === 0) {
                // All deletions failed
                const firstError = errors[0] as { error: { message?: string } };
                toast.error(firstError.error.message || "Nie udało się usunąć aktywności.");
                return;
              }

              // Remove deleted items from list
              mutate((prev) => prev.filter((p) => !deletedIds.has(p.id)));
              setSelectedIds(new Set());

              if (errors.length > 0) {
                // Some deletions failed
                toast.warning(
                  `Usunięto ${deletedIds.size} z ${ids.length} aktywności. Sprawdź uprawnienia dla pozostałych.`
                );
              } else {
                // All deletions succeeded
                toast.success(deletedIds.size === 1 ? "Aktywność została usunięta." : "Aktywności zostały usunięte.");
              }
              setStatusMsg("Aktywności zostały usunięte.");
              await refresh();
            } else {
              if (!canRestore) return;
              const results = await Promise.all(ids.map(async (id) => restoreActivity(id)));
              const restoredIds = new Set(
                results
                  .filter((r): r is { data: ActivityWithEditorsDTO } => "data" in r && !!r.data)
                  .map((r) => r.data.id)
              );
              // Remove restored items from deleted list
              mutate((prev) => prev.filter((p) => !restoredIds.has(p.id)));
              setSelectedIds(new Set());
              toast.success("Aktywności zostały przywrócone.");
              setStatusMsg("Aktywności zostały przywrócone.");
              await refresh();
            }
          } catch {
            toast.error("Nie udało się usunąć części aktywności.");
          } finally {
            setProcessing(false);
            setConfirm(null);
          }
        }}
      />

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        groupId={groupId}
        onSuccess={handleCreateSuccess}
      />

      {/* sr-only live region for status updates */}
      <div ref={liveRef} tabIndex={-1} aria-live="polite" className="sr-only">
        {statusMsg || ""}
      </div>
    </section>
  );
}
