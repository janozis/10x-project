import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ActivityCreateVM, FieldErrors } from "./types";

export interface LogisticsStepProps {
  values: ActivityCreateVM;
  errors: FieldErrors;
  onChange: (field: keyof ActivityCreateVM, value: string | number) => void;
  onBack: () => void;
}

export default function LogisticsStep({ values, errors, onChange, onBack }: LogisticsStepProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="location">Miejsce</Label>
        <Input id="location" value={values.location} onChange={(e) => onChange("location", e.target.value)} />
        {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="materials">Materiały</Label>
        <Textarea id="materials" value={values.materials} onChange={(e) => onChange("materials", e.target.value)} />
        {errors.materials && <p className="text-sm text-red-600">{errors.materials}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="responsible">Odpowiedzialny</Label>
        <Input id="responsible" value={values.responsible} onChange={(e) => onChange("responsible", e.target.value)} />
        {errors.responsible && <p className="text-sm text-red-600">{errors.responsible}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="knowledge_scope">Zakres wiedzy</Label>
        <Input
          id="knowledge_scope"
          value={values.knowledge_scope}
          onChange={(e) => onChange("knowledge_scope", e.target.value)}
        />
        {errors.knowledge_scope && <p className="text-sm text-red-600">{errors.knowledge_scope}</p>}
      </div>

      <div className="pt-2">
        <Button variant="ghost" type="button" onClick={onBack}>
          Wstecz
        </Button>
      </div>
    </div>
  );
}
