import * as React from "react";
import type { GroupPermissionsDTO, GroupTaskDTO, UUID } from "@/types";
import { getTaskWithMeta, patchTaskWithIfMatch, deleteTask } from "@/lib/groups/tasks/api.client";
import { getGroupPermissions } from "@/lib/groups/api.client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskHeader } from "@/components/tasks/TaskHeader";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskMeta } from "@/components/tasks/TaskMeta";
import type { GroupTaskUpdateInput } from "@/lib/validation/groupTask";

export interface TaskDetailsViewProps {
  taskId: UUID;
}

export function TaskDetailsView({ taskId }: TaskDetailsViewProps): JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [task, setTask] = React.useState<GroupTaskDTO | undefined>(undefined);
  const [permissions, setPermissions] = React.useState<GroupPermissionsDTO | null>(null);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  const [etag, setEtag] = React.useState<string | undefined>(undefined);
  const [redirectMsg, setRedirectMsg] = React.useState<string | undefined>(undefined);

  const canEdit: boolean = React.useMemo(() => {
    const role = permissions?.role;
    return role === "admin" || role === "editor";
  }, [permissions]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await getTaskWithMeta(taskId);
      if ("error" in (res as any)) {
        setError((res as any).error.message);
        setTask(undefined);
        setPermissions(null);
        return;
      }
      const ok = res as any;
      setTask(ok.data);
      setEtag(ok?._meta?.etag);
      try {
        const permsRes = await getGroupPermissions(ok.data.group_id);
        if ("error" in permsRes) {
          setPermissions(null);
        } else {
          setPermissions(permsRes.data);
        }
      } catch {
        // Non-fatal for the details view; defaults to read-only
        setPermissions(null);
      }
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Nie udało się pobrać zadania.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = React.useCallback(
    async (payload: GroupTaskUpdateInput) => {
      if (!task) return { ok: false as const, message: "Brak zadania" };
      setSuccess(undefined);
      try {
        const res = await patchTaskWithIfMatch(task.id, payload, etag);
        if ("error" in (res as any)) {
          const err = (res as any).error as { code?: string; message: string; details?: Record<string, unknown> };
          if (err.code === "CONFLICT") {
            toast.error("Konflikt edycji – odświeżam dane.");
            await refresh();
          }
          return { ok: false as const, code: err.code, details: err.details, message: err.message };
        }
        const ok = res as any;
        setEtag(ok?._meta?.etag ?? etag);
        setSuccess("Zapisano zmiany.");
        toast.success("Zapisano zmiany");
        await refresh();
        return { ok: true as const };
      } catch (e: any) {
        const message: string = e?.body?.error?.message || e?.message || "Nie udało się zapisać zmian.";
        toast.error(message);
        return { ok: false as const, message };
      }
    },
    [task, etag, refresh]
  );

  const onDelete = React.useCallback(async () => {
    if (!task) return;
    const confirmed = window.confirm("Czy na pewno chcesz usunąć to zadanie?");
    if (!confirmed) return;
    setError(undefined);
    setSuccess(undefined);
    try {
      const res = await deleteTask(task.id);
      if ("error" in res) {
        setError(res.error.message);
        toast.error(res.error.message);
        return;
      }
      const target = task.group_id ? `/groups/${task.group_id}` : "/groups";
      const msg = "Usunięto zadanie. Przekierowuję…";
      setRedirectMsg(msg);
      toast.success(msg);
      window.setTimeout(() => {
        window.location.href = target;
      }, 600);
    } catch (e: any) {
      const message: string = e?.body?.error?.message || e?.message || "Nie udało się usunąć zadania.";
      setError(message);
      toast.error(message);
    }
  }, [task]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="h-28 w-full animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Błąd</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="alert" aria-live="assertive" className="text-sm text-red-600">
            {error}
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refresh()}>
              Spróbuj ponownie
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nie znaleziono zadania</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Zadanie mogło zostać usunięte lub nie istnieje.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TaskHeader title={task.title} status={task.status} />

      {success ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          {success}
        </div>
      ) : null}
      {redirectMsg ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-blue-600/30 bg-blue-50 px-3 py-2 text-sm text-blue-700"
        >
          {redirectMsg}
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <TaskForm task={task} groupId={task.group_id} canEdit={canEdit} onSubmit={onSubmit} onDelete={onDelete} />
        </CardContent>
      </Card>

      <TaskMeta
        createdAt={task.created_at}
        updatedAt={task.updated_at}
        groupId={task.group_id}
        activityId={task.activity_id}
      />
    </div>
  );
}
