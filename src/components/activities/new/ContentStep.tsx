import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ActivityCreateVM, FieldErrors } from "./types";

export interface ContentStepProps {
  values: ActivityCreateVM;
  errors: FieldErrors;
  onChange: (field: keyof ActivityCreateVM, value: string | number) => void;
  onBack: () => void;
}

export default function ContentStep({ values, errors, onChange, onBack }: ContentStepProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="tasks">Zadania</Label>
        <Textarea id="tasks" value={values.tasks} onChange={(e) => onChange("tasks", e.target.value)} />
        {errors.tasks && <p className="text-sm text-red-600">{errors.tasks}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="flow">Przebieg</Label>
        <Textarea id="flow" value={values.flow} onChange={(e) => onChange("flow", e.target.value)} />
        {errors.flow && <p className="text-sm text-red-600">{errors.flow}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="summary">Podsumowanie</Label>
        <Textarea id="summary" value={values.summary} onChange={(e) => onChange("summary", e.target.value)} />
        {errors.summary && <p className="text-sm text-red-600">{errors.summary}</p>}
      </div>

      <div className="pt-2">
        <Button variant="ghost" type="button" onClick={onBack}>
          Wstecz
        </Button>
      </div>
    </div>
  );
}


