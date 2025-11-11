/* eslint-disable jsx-a11y/label-has-associated-control */
import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ActivityFormValues } from "@/lib/editor/useActivity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ActivityFormProps {
  form: UseFormReturn<ActivityFormValues>;
  readOnly?: boolean;
  onSubmit?: (values: ActivityFormValues) => void | Promise<void>;
}

export function ActivityForm({ form, readOnly = false, onSubmit }: ActivityFormProps): JSX.Element {
  const { register, formState, handleSubmit } = form;
  const { errors } = formState;
  const watch = form.watch;

  // Live counters
  const titleLen = (watch("title") || "").length;
  const objectiveLen = (watch("objective") || "").length;
  const tasksLen = (watch("tasks") || "").length;
  const locationLen = (watch("location") || "").length;
  const materialsLen = (watch("materials") || "").length;
  const responsibleLen = (watch("responsible") || "").length;
  const knowledgeLen = (watch("knowledge_scope") || "").length;
  const participantsLen = (watch("participants") || "").length;
  const flowLen = (watch("flow") || "").length;
  const summaryLen = (watch("summary") || "").length;

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((v) => {
        void onSubmit?.(v);
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm">Tytuł*</label>
          <Input
            disabled={readOnly}
            {...register("title")}
            placeholder="Np. Gra terenowa..."
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "err-title" : "desc-title"}
          />
          <div id="desc-title" className="mt-1 text-[11px] text-muted-foreground">
            Krótki, zwięzły tytuł. <span className="ml-1">{titleLen}/200</span>
          </div>
          {errors.title ? (
            <div id="err-title" role="alert" className="mt-1 text-xs text-destructive">
              {String(errors.title.message)}
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm">Czas trwania (minuty)*</label>
          <Input
            type="number"
            disabled={readOnly}
            {...register("duration_minutes", { valueAsNumber: true })}
            placeholder="60"
            aria-invalid={!!errors.duration_minutes}
            aria-describedby={errors.duration_minutes ? "err-duration" : undefined}
          />
          {errors.duration_minutes ? (
            <div id="err-duration" role="alert" className="mt-1 text-xs text-destructive">
              {String(errors.duration_minutes.message)}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Cel*</label>
        <Textarea
          disabled={readOnly}
          rows={2}
          {...register("objective")}
          aria-invalid={!!errors.objective}
          aria-describedby={errors.objective ? "err-objective" : "desc-objective"}
        />
        <div id="desc-objective" className="mt-1 text-[11px] text-muted-foreground">
          Opis celu edukacyjnego. {objectiveLen}/2000
        </div>
        {errors.objective ? (
          <div id="err-objective" role="alert" className="mt-1 text-xs text-destructive">
            {String(errors.objective.message)}
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm">Zadania*</label>
        <Textarea
          disabled={readOnly}
          rows={3}
          {...register("tasks")}
          aria-invalid={!!errors.tasks}
          aria-describedby={errors.tasks ? "err-tasks" : "desc-tasks"}
        />
        <div id="desc-tasks" className="mt-1 text-[11px] text-muted-foreground">
          Wypunktuj kluczowe zadania. {tasksLen}/4000
        </div>
        {errors.tasks ? (
          <div id="err-tasks" role="alert" className="mt-1 text-xs text-destructive">
            {String(errors.tasks.message)}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm">Miejsce*</label>
          <Input
            disabled={readOnly}
            {...register("location")}
            aria-invalid={!!errors.location}
            aria-describedby={errors.location ? "err-location" : "desc-location"}
          />
          <div id="desc-location" className="mt-1 text-[11px] text-muted-foreground">
            Przestrzeń, np. sala gimnastyczna. {locationLen}/500
          </div>
          {errors.location ? (
            <div id="err-location" role="alert" className="mt-1 text-xs text-destructive">
              {String(errors.location.message)}
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm">Materiały*</label>
          <Input
            disabled={readOnly}
            {...register("materials")}
            aria-invalid={!!errors.materials}
            aria-describedby={errors.materials ? "err-materials" : "desc-materials"}
          />
          <div id="desc-materials" className="mt-1 text-[11px] text-muted-foreground">
            Lista materiałów. {materialsLen}/2000
          </div>
          {errors.materials ? (
            <div id="err-materials" role="alert" className="mt-1 text-xs text-destructive">
              {String(errors.materials.message)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm">Odpowiedzialny*</label>
          <Input
            disabled={readOnly}
            {...register("responsible")}
            aria-invalid={!!errors.responsible}
            aria-describedby={errors.responsible ? "err-responsible" : "desc-responsible"}
          />
          <div id="desc-responsible" className="mt-1 text-[11px] text-muted-foreground">
            Osoba prowadząca. {responsibleLen}/200
          </div>
          {errors.responsible ? (
            <div id="err-responsible" role="alert" className="mt-1 text-xs text-destructive">
              {String(errors.responsible.message)}
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm">Zakres wiedzy*</label>
          <Input
            disabled={readOnly}
            {...register("knowledge_scope")}
            aria-invalid={!!errors.knowledge_scope}
            aria-describedby={errors.knowledge_scope ? "err-knowledge" : "desc-knowledge"}
          />
          <div id="desc-knowledge" className="mt-1 text-[11px] text-muted-foreground">
            Tematyka i zagadnienia. {knowledgeLen}/1000
          </div>
          {errors.knowledge_scope ? (
            <div id="err-knowledge" role="alert" className="mt-1 text-xs text-destructive">
              {String(errors.knowledge_scope.message)}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Uczestnicy*</label>
        <Textarea
          disabled={readOnly}
          rows={2}
          {...register("participants")}
          aria-invalid={!!errors.participants}
          aria-describedby={errors.participants ? "err-participants" : "desc-participants"}
        />
        <div id="desc-participants" className="mt-1 text-[11px] text-muted-foreground">
          Np. grupa 20 osób, wiek 10-12. {participantsLen}/2000
        </div>
        {errors.participants ? (
          <div id="err-participants" role="alert" className="mt-1 text-xs text-destructive">
            {String(errors.participants.message)}
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm">Przebieg*</label>
        <Textarea
          disabled={readOnly}
          rows={4}
          {...register("flow")}
          aria-invalid={!!errors.flow}
          aria-describedby={errors.flow ? "err-flow" : "desc-flow"}
        />
        <div id="desc-flow" className="mt-1 text-[11px] text-muted-foreground">
          Kroki, instrukcje. {flowLen}/8000
        </div>
        {errors.flow ? (
          <div id="err-flow" role="alert" className="mt-1 text-xs text-destructive">
            {String(errors.flow.message)}
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm">Podsumowanie*</label>
        <Textarea
          disabled={readOnly}
          rows={3}
          {...register("summary")}
          aria-invalid={!!errors.summary}
          aria-describedby={errors.summary ? "err-summary" : "desc-summary"}
        />
        <div id="desc-summary" className="mt-1 text-[11px] text-muted-foreground">
          Wnioski i refleksje. {summaryLen}/4000
        </div>
        {errors.summary ? (
          <div id="err-summary" role="alert" className="mt-1 text-xs text-destructive">
            {String(errors.summary.message)}
          </div>
        ) : null}
      </div>
    </form>
  );
}
