import * as React from "react";
import type { UUID, TaskStatus } from "@/types";
import { useGroupTasks } from "@/lib/groups/tasks/useGroupTasks";
import { FiltersBar } from "@/components/groups/tasks/FiltersBar";
import { TaskColumn } from "@/components/groups/tasks/TaskColumn";
import { BulkActionsBar } from "@/components/groups/tasks/BulkActionsBar";
import { listActivities } from "@/lib/activities/api.client";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";
import { toast } from "sonner";
import { useIntersection } from "@/lib/hooks/useIntersection";

interface TasksBoardProps {
  groupId: UUID;
  defaultActivityId?: UUID;
}

export default function TasksBoard({ groupId, defaultActivityId }: TasksBoardProps): JSX.Element {
  const {
    columns,
    loading,
    error,
    nextCursor,
    loadMore,
    filters,
    setFilters,
    canEdit,
    createTask,
    updateTask,
    deleteTask,
  } = useGroupTasks(groupId, {
    activityId: defaultActivityId,
  });

  const statuses: TaskStatus[] = ["pending", "in_progress", "done", "canceled"];

  const [activities, setActivities] = React.useState<{ id: UUID; title: string }[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<UUID>>(new Set());
  const [confirm, setConfirm] = React.useState<{ type: "bulk-delete"; ids: UUID[] } | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const inView = useIntersection(sentinelRef, { root: null, rootMargin: "0px 0px 30% 0px", threshold: 0 });
  const totalTasks = React.useMemo(() => columns.reduce((acc, c) => acc + (c.tasks?.length ?? 0), 0), [columns]);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listActivities(groupId, { limit: 100 });
        if (!mounted) return;

        // Check if response is undefined or is an error
        if (!res) {
          setActivities([]);
          return;
        }

        if ("error" in res) {
          setActivities([]);
          return;
        }

        const items = (res.data ?? []).map((a) => ({ id: a.id, title: a.title }));
        setActivities(items);
      } catch {
        if (!mounted) return;
        setActivities([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [groupId]);

  // Auto-load more on intersection
  React.useEffect(() => {
    if (!inView) return;
    if (!nextCursor || loading) return;
    void loadMore();
  }, [inView, nextCursor, loading, loadMore]);

  // URL <-> filters sync
  React.useEffect(() => {
    // initialize from current URL
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("status");
    const a = sp.get("activity_id");
    const patch: any = {};
    if (s && (s === "pending" || s === "in_progress" || s === "done" || s === "canceled")) patch.status = s;
    if (a && /^[0-9a-fA-F-]{36}$/.test(a)) patch.activityId = a as UUID;
    if (Object.keys(patch).length > 0) setFilters(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (filters.status) url.searchParams.set("status", filters.status);
    else url.searchParams.delete("status");
    if (filters.activityId) url.searchParams.set("activity_id", filters.activityId);
    else url.searchParams.delete("activity_id");
    const next = url.toString();
    if (next !== window.location.href) {
      window.history.replaceState({}, "", next);
    }
  }, [filters.status, filters.activityId]);

  const toggleSelect = React.useCallback((id: UUID, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const onBulkStatus = React.useCallback(
    async (status: TaskStatus) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      try {
        await Promise.all(ids.map((id) => updateTask(id, { status })));
        toast.success("Status zadań został zaktualizowany.");
      } catch {
        toast.error("Nie udało się zaktualizować części zadań.");
      }
    },
    [selectedIds, updateTask]
  );

  const onBulkDelete = React.useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirm({ type: "bulk-delete", ids });
  }, [selectedIds]);

  return (
    <div className="flex flex-col gap-4" data-test-id="tasks-board">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm"
          data-test-id="tasks-error-message"
        >
          {error}
        </div>
      ) : null}

      <FiltersBar filters={filters} activities={activities} onChange={setFilters} />

      {!loading && totalTasks === 0 ? (
        <div
          role="note"
          className="rounded-md border border-muted/60 bg-muted/20 text-muted-foreground p-3 text-sm"
          data-test-id="tasks-empty-state"
        >
          Brak zadań spełniających kryteria.
          <button
            type="button"
            className="ml-2 inline-flex h-7 items-center justify-center rounded-md border bg-background px-2 text-xs hover:bg-accent"
            onClick={() => setFilters({ status: undefined, activityId: undefined })}
            data-test-id="tasks-reset-filters-button"
          >
            Reset filtrów
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statuses.map((status) => {
          const col = columns.find((c) => c.status === status);
          return (
            <TaskColumn
              key={status}
              status={status}
              tasks={col?.tasks ?? []}
              canEdit={canEdit}
              activities={activities}
              defaultActivityId={defaultActivityId}
              onCreateQuick={status === "pending" ? createTask : undefined}
              onSelectChange={toggleSelect}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center py-2">
        {nextCursor ? (
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-accent"
            disabled={loading}
            data-test-id="tasks-load-more-button"
          >
            {loading ? "Ładowanie…" : "Załaduj więcej"}
          </button>
        ) : null}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} aria-hidden className="h-2 w-full" />

      {/* Auto-load more when in view */}
      {inView && nextCursor && !loading ? <span className="sr-only">Ładowanie kolejnych zadań…</span> : null}

      <BulkActionsBar
        selectedIds={Array.from(selectedIds)}
        onBulkStatus={onBulkStatus}
        onBulkDelete={onBulkDelete}
        canEdit={canEdit}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Usuń wybrane zadania"
        description="Czy na pewno chcesz usunąć zaznaczone zadania?"
        confirmText="Usuń"
        variant="destructive"
        onConfirm={async () => {
          if (!confirm) return;
          try {
            await Promise.all(confirm.ids.map((id) => deleteTask(id)));
            toast.success("Zadania zostały usunięte.");
            setSelectedIds(new Set());
          } catch {
            toast.error("Nie udało się usunąć części zadań.");
          } finally {
            setConfirm(null);
          }
        }}
      />
    </div>
  );
}

function labelForStatus(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Oczekujące";
    case "in_progress":
      return "W toku";
    case "done":
      return "Zrobione";
    case "canceled":
      return "Anulowane";
    default:
      return status;
  }
}
