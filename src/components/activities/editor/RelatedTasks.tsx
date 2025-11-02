import * as React from "react";
import type { UUID, GroupTaskDTO } from "@/types";
import { listGroupTasks } from "@/lib/groups/tasks/api.client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RelatedTasksProps {
  activityId: UUID;
  groupId: UUID;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Do zrobienia",
  in_progress: "W trakcie",
  done: "Gotowe",
  canceled: "Anulowane",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "default",
  done: "secondary",
  canceled: "destructive",
};

export function RelatedTasks({ activityId, groupId }: RelatedTasksProps): JSX.Element {
  const [tasks, setTasks] = React.useState<GroupTaskDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setError(undefined);
      try {
        const result = await listGroupTasks(groupId, { 
          activityId,
          limit: 100 
        });
        
        if (cancelled) return;
        
        if ("error" in result) {
          setError(result.error.message);
          setTasks([]);
        } else {
          setTasks(result.data || []);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Błąd pobierania zadań");
        setTasks([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [activityId, groupId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Powiązane zadania</CardTitle>
          <CardDescription>Ładowanie zadań...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Powiązane zadania</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Powiązane zadania</CardTitle>
          <CardDescription>Brak zadań przypisanych do tej aktywności</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zadania można przypisać do tej aktywności podczas edycji zadania.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Powiązane zadania</CardTitle>
        <CardDescription>
          {tasks.length} {tasks.length === 1 ? "zadanie" : tasks.length < 5 ? "zadania" : "zadań"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <a
              key={task.id}
              href={`/tasks/${task.id}?from=activity&activity_id=${activityId}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium leading-tight">{task.title}</h3>
                  {task.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {task.due_date && (
                      <span>
                        Termin: {new Date(task.due_date).toLocaleDateString("pl-PL")}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANTS[task.status] || "outline"}>
                  {STATUS_LABELS[task.status] || task.status}
                </Badge>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

