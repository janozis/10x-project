import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { UUID } from "@/types";

export interface QuickAddInput {
  title: string;
  description: string;
  dueDate?: string | null;
  activityId?: UUID | null;
}

interface QuickAddProps {
  defaultActivityId?: UUID;
  canCreate: boolean;
  onCreate: (input: QuickAddInput) => Promise<void>;
}

export function QuickAdd({ defaultActivityId, canCreate, onCreate }: QuickAddProps): JSX.Element | null {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [activityId, setActivityId] = React.useState<string>(defaultActivityId ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [descriptionError, setDescriptionError] = React.useState<string | null>(null);
  const [dueDateError, setDueDateError] = React.useState<string | null>(null);
  const [activityIdError, setActivityIdError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!canCreate) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTitleError(null);
    setDescriptionError(null);
    setDueDateError(null);
    setActivityIdError(null);
    const titleTrim = title.trim();
    const descriptionTrim = description.trim();
    if (titleTrim.length < 1 || titleTrim.length > 200) {
      setTitleError("Tytuł jest wymagany [1..200].");
      return;
    }
    if (descriptionTrim.length < 1 || descriptionTrim.length > 4000) {
      setDescriptionError("Opis jest wymagany [1..4000].");
      return;
    }
    if (activityId && !/^[0-9a-fA-F-]{36}$/.test(activityId)) {
      setActivityIdError("Nieprawidłowy UUID aktywności.");
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setDueDateError("Nieprawidłowa data (YYYY-MM-DD).");
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({
        title: titleTrim,
        description: descriptionTrim,
        dueDate: dueDate || null,
        activityId: activityId || null,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setActivityId(defaultActivityId ?? "");
    } catch (e: any) {
      const details = e?.body?.error?.details as Record<string, string> | undefined;
      const message = e?.body?.error?.message || e?.message || "Nie udało się utworzyć zadania.";
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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
      <div className="text-xs font-medium text-muted-foreground">Szybkie dodanie</div>
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm"
        >
          {error}
        </div>
      ) : null}
      <div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł"
          aria-invalid={!!titleError}
        />
        {titleError ? <div className="mt-1 text-xs text-destructive">{titleError}</div> : null}
      </div>
      <div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opis"
          aria-invalid={!!descriptionError}
        />
        {descriptionError ? <div className="mt-1 text-xs text-destructive">{descriptionError}</div> : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Input
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="Termin (YYYY-MM-DD)"
            aria-invalid={!!dueDateError}
          />
          {dueDateError ? <div className="mt-1 text-xs text-destructive">{dueDateError}</div> : null}
        </div>
        <div>
          <Input
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            placeholder="UUID aktywności (opcjonalnie)"
            aria-invalid={!!activityIdError}
          />
          {activityIdError ? <div className="mt-1 text-xs text-destructive">{activityIdError}</div> : null}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Dodawanie…" : "Dodaj"}
        </Button>
      </div>
    </form>
  );
}
