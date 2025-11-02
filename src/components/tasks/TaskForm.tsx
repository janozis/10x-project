import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { GroupTaskDTO, TaskStatus, UUID } from "@/types";
import { groupTaskUpdateSchema, type GroupTaskUpdateInput } from "@/lib/validation/groupTask";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/tasks/StatusSelect";
import { ActivitySelect } from "@/components/tasks/ActivitySelect";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface TaskFormProps {
  task: GroupTaskDTO;
  groupId: UUID;
  canEdit: boolean;
  onSubmit: (
    payload: GroupTaskUpdateInput
  ) => Promise<
    | { ok: true }
    | { ok: false; code?: string; details?: Record<string, unknown>; message?: string }
  >;
  onDelete: () => Promise<void> | void;
}

type TaskFormValues = {
  title?: string;
  description?: string;
  due_date?: string | null;
  status?: TaskStatus;
  activity_id?: string | null;
};

export function TaskForm({ task, groupId, canEdit, onSubmit, onDelete }: TaskFormProps): JSX.Element {
  const [submitError, setSubmitError] = React.useState<string | undefined>(undefined);
  const alertRef = React.useRef<HTMLDivElement>(null);
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(groupTaskUpdateSchema),
    mode: "onChange",
    defaultValues: {
      title: task.title,
      description: task.description,
      due_date: task.due_date ?? null,
      status: task.status,
      activity_id: task.activity_id ?? null,
    },
  });

  const { register, handleSubmit, formState, watch, setValue, setError, clearErrors } = form;
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const disableSave = !canEdit || !formState.isValid || !formState.isDirty || formState.isSubmitting;

  const submitHandler = React.useCallback(
    async (values: TaskFormValues) => {
      setSubmitError(undefined);
      clearErrors();
      const payload: Record<string, unknown> = {};
      const dirty = formState.dirtyFields as Record<string, unknown>;
      for (const key of Object.keys(dirty)) {
        // @ts-expect-error dynamic access
        let val = values[key];
        if (key === "due_date" && (val === "" || val === undefined)) val = null;
        if (val !== undefined) {
          // @ts-expect-error dynamic assign
          payload[key] = val;
        }
      }
      if (Object.keys(payload).length === 0) return;
      const result = await onSubmit(payload as GroupTaskUpdateInput);
      if (!result.ok) {
        setSubmitError(result.message);
        const details = result.details;
        if (details && typeof details === "object") {
          for (const [key, val] of Object.entries(details)) {
            const first = Array.isArray(val) ? (val[0] as unknown) : val;
            const message = typeof first === "string" ? first : undefined;
            if (message) {
              // @ts-expect-error dynamic field name mapping
              setError(key, { type: "server", message });
            }
          }
        }
        if (alertRef.current) {
          alertRef.current.focus();
        }
      }
    },
    [formState.dirtyFields, onSubmit, clearErrors, setError]
  );

  const status = watch("status") as TaskStatus | undefined;

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-6">
      {submitError ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600/30 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {submitError}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Tytuł</Label>
          <Input id="title" {...register("title")} disabled={!canEdit} />
          {formState.errors.title ? (
            <p role="alert" className="text-xs text-red-600">{formState.errors.title.message as string}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Termin</Label>
          <Input
            id="due_date"
            type="date"
            value={(watch("due_date") ?? "") as string}
            onChange={(e) => setValue("due_date", e.target.value || null, { shouldDirty: true, shouldValidate: true })}
            disabled={!canEdit}
          />
          {formState.errors.due_date ? (
            <p role="alert" className="text-xs text-red-600">{formState.errors.due_date.message as string}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea id="description" rows={5} {...register("description")} disabled={!canEdit} />
        {formState.errors.description ? (
          <p role="alert" className="text-xs text-red-600">{formState.errors.description.message as string}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <StatusSelect
            value={status ?? task.status}
            onChange={(v) => setValue("status", v, { shouldDirty: true, shouldValidate: true })}
            disabled={!canEdit}
          />
          {formState.errors.status ? (
            <p role="alert" className="text-xs text-red-600">{formState.errors.status.message as string}</p>
          ) : null}
        </div>

        <ActivitySelect
          groupId={groupId}
          value={watch("activity_id") ?? null}
          onChange={(activityId) => setValue("activity_id", activityId, { shouldDirty: true, shouldValidate: true })}
          disabled={!canEdit}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {canEdit ? (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="destructive">Usuń</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Usuń zadanie</DialogTitle>
                <DialogDescription>
                  Tej operacji nie można cofnąć. Czy na pewno chcesz usunąć to zadanie?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>Anuluj</Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    setConfirmOpen(false);
                    await onDelete();
                  }}
                >
                  Usuń
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
        <Button type="submit" disabled={disableSave}>
          Zapisz zmiany
        </Button>
      </div>
    </form>
  );
}


