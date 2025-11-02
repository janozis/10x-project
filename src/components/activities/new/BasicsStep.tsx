import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ActivityCreateVM, FieldErrors } from "./types";

export interface BasicsStepProps {
  values: ActivityCreateVM;
  errors: FieldErrors;
  onChange: (field: keyof ActivityCreateVM, value: string | number) => void;
}

export default function BasicsStep({ values, errors, onChange }: BasicsStepProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Tytuł</Label>
        <Input id="title" value={values.title} onChange={(e) => onChange("title", e.target.value)} />
        {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="objective">Cel</Label>
        <Textarea id="objective" value={values.objective} onChange={(e) => onChange("objective", e.target.value)} />
        {errors.objective && <p className="text-sm text-red-600">{errors.objective}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="duration_minutes">Czas trwania (minuty)</Label>
        <Input
          id="duration_minutes"
          type="number"
          min={5}
          max={1440}
          value={values.duration_minutes === "" ? "" : String(values.duration_minutes)}
          onChange={(e) => onChange("duration_minutes", e.target.value === "" ? "" : Number(e.target.value))}
        />
        {errors.duration_minutes && <p className="text-sm text-red-600">{errors.duration_minutes}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="participants">Uczestnicy</Label>
        <Input id="participants" value={values.participants} onChange={(e) => onChange("participants", e.target.value)} />
        {errors.participants && <p className="text-sm text-red-600">{errors.participants}</p>}
      </div>
    </div>
  );
}


