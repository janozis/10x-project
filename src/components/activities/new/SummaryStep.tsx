import * as React from "react";
import type { ActivityCreateVM, FieldErrors } from "./types";

export interface SummaryStepProps {
  values: ActivityCreateVM;
  errors: FieldErrors;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function SummaryStep({ values, errors, onBack }: SummaryStepProps) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label="Tytuł" value={values.title} />
        <Field label="Cel" value={values.objective} />
        <Field label="Czas trwania (min)" value={String(values.duration_minutes || "")} />
        <Field label="Uczestnicy" value={values.participants} />
        <Field label="Miejsce" value={values.location} />
        <Field label="Odpowiedzialny" value={values.responsible} />
        <Field label="Zakres wiedzy" value={values.knowledge_scope} />
      </div>
      <Field label="Zadania" value={values.tasks} multiline />
      <Field label="Przebieg" value={values.flow} multiline />
      <Field label="Materiały" value={values.materials} multiline />
      <Field label="Podsumowanie" value={values.summary} multiline />

      {Object.keys(errors).length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Proszę poprawić błędy w poprzednich krokach.
        </div>
      )}
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid gap-1">
      <div className="text-sm font-medium text-neutral-600">{label}</div>
      {multiline ? (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{value || "—"}</div>
      ) : (
        <div className="rounded-md border bg-muted/30 p-2 text-sm">{value || "—"}</div>
      )}
    </div>
  );
}


