import * as React from "react";
import type { ActivityDTO } from "@/types";

export interface ActivityFieldsSectionProps {
  activity?: ActivityDTO;
  loading?: boolean;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap leading-relaxed text-sm">{String(value)}</div>
    </div>
  );
}

export function ActivityFieldsSection({ activity, loading }: ActivityFieldsSectionProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (!activity) return <div className="text-sm text-muted-foreground">Brak danych aktywności.</div>;
  return (
    <div className="grid grid-cols-1 gap-6">
      <Field label="Cel" value={activity.objective} />
      <Field label="Zadania" value={activity.tasks} />
      <Field label="Czas trwania (min)" value={activity.duration_minutes} />
      <Field label="Miejsce" value={activity.location} />
      <Field label="Materiały" value={activity.materials} />
      <Field label="Odpowiedzialni" value={activity.responsible} />
      <Field label="Zakres wiedzy" value={activity.knowledge_scope} />
      <Field label="Uczestnicy" value={activity.participants} />
      <Field label="Przebieg" value={activity.flow} />
      <Field label="Podsumowanie" value={activity.summary} />
    </div>
  );
}


