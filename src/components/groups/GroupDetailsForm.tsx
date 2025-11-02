import * as React from "react";
import { z } from "zod";
import type { GroupDTO, GroupUpdateCommand, UUID } from "@/types";
import { groupUpdateSchema } from "@/lib/validation/group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface GroupDetailsFormModel {
  name: string;
  description: string;
  lore_theme: string;
  start_date: string;
  end_date: string;
  max_members?: number;
  status: "planning" | "active" | "archived";
}

interface Props {
  initial: GroupDetailsFormModel;
  canEdit: boolean;
  isSubmitting?: boolean;
  onSave: (changes: GroupUpdateCommand) => Promise<void>;
  onToggleArchive: (nextStatus: GroupDTO["status"]) => Promise<void>;
}

export function GroupDetailsForm({ initial, canEdit, isSubmitting, onSave, onToggleArchive }: Props): JSX.Element {
  const [values, setValues] = React.useState<GroupDetailsFormModel>(initial);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setValues(initial);
  }, [initial]);

  function update<K extends keyof GroupDetailsFormModel>(key: K, val: GroupDetailsFormModel[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    // Validate using zod
    const parsed = groupUpdateSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string | undefined> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as string | undefined;
        if (path) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    try {
      setSubmitting(true);
      await onSave({
        name: values.name,
        description: values.description,
        lore_theme: values.lore_theme,
        start_date: values.start_date,
        end_date: values.end_date,
        max_members: values.max_members,
        status: values.status,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const archiveToggleLabel = values.status === "archived" ? "Odarchiwizuj" : "Archiwizuj";
  const nextStatus: GroupDTO["status"] = values.status === "archived" ? "active" : "archived";

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-disabled={!canEdit}>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Nazwa</Label>
          <Input id="name" value={values.name} onChange={(e) => update("name", e.target.value)} disabled={!canEdit || submitting || isSubmitting} />
          {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
        </div>
        <div>
          <Label htmlFor="description">Opis</Label>
          <Textarea id="description" value={values.description} onChange={(e) => update("description", e.target.value)} disabled={!canEdit || submitting || isSubmitting} />
          {errors.description ? <p className="mt-1 text-xs text-destructive">{errors.description}</p> : null}
        </div>
        <div>
          <Label htmlFor="lore_theme">Motyw lore</Label>
          <Input id="lore_theme" value={values.lore_theme} onChange={(e) => update("lore_theme", e.target.value)} disabled={!canEdit || submitting || isSubmitting} />
          {errors.lore_theme ? <p className="mt-1 text-xs text-destructive">{errors.lore_theme}</p> : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="start_date">Data startu</Label>
            <Input id="start_date" type="date" value={values.start_date} onChange={(e) => update("start_date", e.target.value)} disabled={!canEdit || submitting || isSubmitting} />
            {errors.start_date ? <p className="mt-1 text-xs text-destructive">{errors.start_date}</p> : null}
          </div>
          <div>
            <Label htmlFor="end_date">Data zakończenia</Label>
            <Input id="end_date" type="date" value={values.end_date} onChange={(e) => update("end_date", e.target.value)} disabled={!canEdit || submitting || isSubmitting} />
            {errors.end_date ? <p className="mt-1 text-xs text-destructive">{errors.end_date}</p> : null}
          </div>
          <div>
            <Label htmlFor="max_members">Limit członków</Label>
            <Input
              id="max_members"
              type="number"
              min={1}
              max={500}
              value={values.max_members ?? ""}
              onChange={(e) => update("max_members", e.target.value ? Number(e.target.value) : undefined)}
              disabled={!canEdit || submitting || isSubmitting}
            />
            {errors.max_members ? <p className="mt-1 text-xs text-destructive">{errors.max_members}</p> : null}
          </div>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            value={values.status}
            onChange={(e) => update("status", e.target.value as any)}
            disabled={!canEdit || submitting || isSubmitting}
          >
            <option value="planning">planning</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
          {errors.status ? <p className="mt-1 text-xs text-destructive">{errors.status}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canEdit || submitting || isSubmitting}>
          {submitting || isSubmitting ? "Zapisywanie…" : "Zapisz"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void onToggleArchive(nextStatus);
          }}
          disabled={!canEdit || submitting || isSubmitting}
        >
          {archiveToggleLabel}
        </Button>
      </div>
    </form>
  );
}


