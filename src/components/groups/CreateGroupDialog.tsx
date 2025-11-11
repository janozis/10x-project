import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupCreateSchema } from "@/lib/validation/group";
import type { GroupFormValues } from "@/lib/groups/types";
import type { GroupDTO } from "@/types";
import { useCreateGroup } from "@/lib/groups/useCreateGroup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (group: GroupDTO) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onCreated }: CreateGroupDialogProps): JSX.Element {
  const { create, loading, error } = useCreateGroup();
  const [serverCode, setServerCode] = React.useState<string | undefined>(undefined);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      lore_theme: "",
      start_date: "",
      end_date: "",
      max_members: 50,
    },
    mode: "onChange",
  });

  async function onSubmit(values: GroupFormValues) {
    const res = await create(values);
    if (res.ok) {
      onOpenChange(false);
      onCreated?.(res.data);
      form.reset();
      setServerCode(undefined);
      return;
    }
    // Map specific server-side codes to field errors when possible
    const code = (res.error as { code?: string; details?: Record<string, unknown> })?.code;
    const details = (res.error as { code?: string; details?: Record<string, unknown> })?.details;
    setServerCode(code);
    if (code === "DATE_RANGE_INVALID") {
      form.setError("end_date", { type: "server", message: "Data końcowa musi być ≥ daty początkowej" });
    }
    if (code === "GROUP_LIMIT_REACHED") {
      // Global banner already shows error; we keep field errors untouched
    }
    if (code === "VALIDATION_ERROR" && details && typeof details === "object") {
      for (const [key, val] of Object.entries(details)) {
        const first = Array.isArray(val) ? (val[0] as unknown) : val;
        const message = typeof first === "string" ? first : undefined;
        if (message) {
          // @ts-expect-error dynamic field name mapping
          form.setError(key, { type: "server", message });
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby="create-title" aria-describedby="create-desc" data-test-id="groups-create-dialog">
        <DialogHeader>
          <DialogTitle id="create-title">Utwórz grupę</DialogTitle>
          <DialogDescription id="create-desc">Wprowadź podstawowe informacje o grupie.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" aria-busy={loading}>
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm"
              data-test-id="groups-create-error-message"
            >
              {serverCode === "RATE_LIMIT_EXCEEDED" ? "Przekroczono limit żądań. Spróbuj ponownie za chwilę." : null}
              {serverCode === "GROUP_LIMIT_REACHED"
                ? "Osiągnięto limit liczby grup. Usuń nieużywane lub skontaktuj się z administratorem."
                : null}
              {serverCode === "CONFLICT" ? "Wystąpił konflikt stanu. Odśwież stronę i spróbuj ponownie." : null}
              {!serverCode ? error : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              aria-invalid={!!form.formState.errors.name}
              aria-describedby="name-error"
              data-test-id="groups-create-name-input"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p id="name-error" className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              aria-invalid={!!form.formState.errors.description}
              aria-describedby="desc-error"
              data-test-id="groups-create-description-input"
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p id="desc-error" className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lore_theme">Motyw/lore</Label>
            <Input
              id="lore_theme"
              aria-invalid={!!form.formState.errors.lore_theme}
              aria-describedby="lore-error"
              data-test-id="groups-create-lore-input"
              {...form.register("lore_theme")}
            />
            {form.formState.errors.lore_theme ? (
              <p id="lore-error" className="text-xs text-destructive">
                {form.formState.errors.lore_theme.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_date">Data startu</Label>
              <Input
                id="start_date"
                type="date"
                aria-invalid={!!form.formState.errors.start_date}
                aria-describedby="start-error"
                data-test-id="groups-create-start-date-input"
                {...form.register("start_date")}
              />
              {form.formState.errors.start_date ? (
                <p id="start-error" className="text-xs text-destructive">
                  {form.formState.errors.start_date.message as string}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_date">Data końca</Label>
              <Input
                id="end_date"
                type="date"
                aria-invalid={!!form.formState.errors.end_date}
                aria-describedby="end-error"
                data-test-id="groups-create-end-date-input"
                {...form.register("end_date")}
              />
              {form.formState.errors.end_date ? (
                <p id="end-error" className="text-xs text-destructive">
                  {form.formState.errors.end_date.message as string}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max_members">Limit członków (domyślnie 50)</Label>
            <Input
              id="max_members"
              type="number"
              inputMode="numeric"
              aria-invalid={!!form.formState.errors.max_members}
              aria-describedby="max-error"
              data-test-id="groups-create-max-members-input"
              {...form.register("max_members", { setValueAs: (v) => (v === "" || Number.isNaN(v) ? 50 : Number(v)) })}
            />
            {form.formState.errors.max_members ? (
              <p id="max-error" className="text-xs text-destructive">
                {form.formState.errors.max_members.message as string}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              data-test-id="groups-create-cancel-button"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading} aria-disabled={loading} data-test-id="groups-create-submit-button">
              {loading ? "Zapisywanie…" : "Utwórz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
