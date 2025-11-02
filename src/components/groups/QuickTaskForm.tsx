import * as React from "react";
import type { GroupTaskDTO, UUID } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createGroupTask } from "@/lib/groups/tasks/api.client";

interface QuickTaskFormProps {
  groupId: UUID;
  canCreate: boolean;
  onCreated?: (task: GroupTaskDTO) => void;
}

export function QuickTaskForm({ groupId, canCreate, onCreated }: QuickTaskFormProps): JSX.Element | null {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [activityId, setActivityId] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [descriptionError, setDescriptionError] = React.useState<string | null>(null);
  const [dueDateError, setDueDateError] = React.useState<string | null>(null);
  const [activityIdError, setActivityIdError] = React.useState<string | null>(null);

  if (!canCreate) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTitleError(null);
    setDescriptionError(null);
    setDueDateError(null);
    setActivityIdError(null);
    const titleTrim = title.trim();
    if (titleTrim.length < 1 || titleTrim.length > 200) {
      setTitleError("Tytuł jest wymagany [1..200].");
      return;
    }
    const descriptionTrim = description.trim();
    if (descriptionTrim.length < 1 || descriptionTrim.length > 4000) {
      setDescriptionError("Opis jest wymagany [1..4000].");
      return;
    }
    if (activityId && !/^\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b$/i.test(activityId)) {
      setActivityIdError("Nieprawidłowy UUID aktywności.");
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setDueDateError("Nieprawidłowa data (YYYY-MM-DD).");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createGroupTask(groupId, {
        title: titleTrim,
        description: descriptionTrim,
        due_date: dueDate || null,
        activity_id: activityId || null,
      });
      if ("error" in result) {
        const message = result.error?.message || "Nie udało się utworzyć zadania.";
        setError(message);
        const details = result.error?.details as Record<string, string> | undefined;
        if (details) {
          if (typeof details.title === "string") setTitleError(details.title);
          if (typeof details.description === "string") setDescriptionError(details.description);
          if (typeof details.due_date === "string") setDueDateError(details.due_date);
          if (typeof details.activity_id === "string") setActivityIdError(details.activity_id);
        }
        return;
      }
      const task: GroupTaskDTO = result.data;
      setTitle("");
      setDescription("");
      setDueDate("");
      setActivityId("");
      onCreated?.(task);
      toast.success("Zadanie utworzone.");
    } catch (err: any) {
      const details = err?.body?.error?.details as Record<string, string> | undefined;
      const message = err?.body?.error?.message || err?.message || "Wystąpił błąd sieci. Spróbuj ponownie.";
      setError(message);
      if (details) {
        if (typeof details.title === "string") setTitleError(details.title);
        if (typeof details.description === "string") setDescriptionError(details.description);
        if (typeof details.due_date === "string") setDueDateError(details.due_date);
        if (typeof details.activity_id === "string") setActivityIdError(details.activity_id);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id="quick-task" onSubmit={handleSubmit} className="my-6 grid grid-cols-1 gap-3 rounded-lg border p-4">
      <div className="text-sm font-medium">Szybkie zadanie</div>
      {error ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm">{error}</div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm">Tytuł*</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Np. Przygotować materiały" aria-invalid={!!titleError} />
          {titleError ? <div className="mt-1 text-xs text-destructive">{titleError}</div> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm">Termin (YYYY-MM-DD)</label>
          <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="2025-12-31" aria-invalid={!!dueDateError} />
          {dueDateError ? <div className="mt-1 text-xs text-destructive">{dueDateError}</div> : null}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">Powiązana aktywność (UUID, opcjonalnie)</label>
        <Input value={activityId} onChange={(e) => setActivityId(e.target.value)} placeholder="UUID aktywności" aria-invalid={!!activityIdError} />
        {activityIdError ? <div className="mt-1 text-xs text-destructive">{activityIdError}</div> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm">Opis*</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Szczegóły zadania" aria-invalid={!!descriptionError} />
        {descriptionError ? <div className="mt-1 text-xs text-destructive">{descriptionError}</div> : null}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Tworzenie…" : "Utwórz"}
        </Button>
      </div>
    </form>
  );
}


