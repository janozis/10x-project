import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeInviteCodeInput, isValidInviteCode, formatInviteCodeMasked } from "@/lib/validation/join";
import { useJoinGroup } from "@/lib/groups/useJoinGroup";

export interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJoined?: () => void;
}

interface FormValues { code: string }

export function JoinGroupDialog({ open, onOpenChange, onJoined }: JoinGroupDialogProps): JSX.Element {
  const { join, loading, error } = useJoinGroup();
  const [serverCode, setServerCode] = React.useState<string | undefined>(undefined);

  const form = useForm<FormValues>({
    defaultValues: { code: "" },
    mode: "onChange",
  });

  const codeValue = form.watch("code");
  const masked = formatInviteCodeMasked(codeValue);
  const isValid = isValidInviteCode(codeValue);

  async function onSubmit(values: FormValues) {
    const res = await join(values.code);
    if (res.ok) {
      onOpenChange(false);
      onJoined?.();
      form.reset();
      setServerCode(undefined);
      return;
    }
    const code = (res.error as any)?.code as string | undefined;
    setServerCode(code);
    if (code === "INVITE_INVALID") {
      form.setError("code", { type: "server", message: "Nieprawidłowy kod zaproszenia." });
    } else if (code === "INVITE_EXPIRED") {
      form.setError("code", { type: "server", message: "Kod zaproszenia wygasł." });
    } else if (code === "INVITE_MAXED") {
      form.setError("code", { type: "server", message: "Wykorzystano maksymalną liczbę użyć kodu." });
    } else if (code === "NOT_FOUND") {
      form.setError("code", { type: "server", message: "Nie znaleziono grupy dla tego kodu." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby="join-title" aria-describedby="join-desc">
        <DialogHeader>
          <DialogTitle id="join-title">Dołącz do grupy</DialogTitle>
          <DialogDescription id="join-desc">Wpisz 8-znakowy kod zaproszenia.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" aria-busy={loading}>
          {error ? (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm">
              {serverCode === "RATE_LIMIT_EXCEEDED" ? "Przekroczono limit żądań. Spróbuj ponownie za chwilę." : error}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="code">Kod zaproszenia</Label>
            <Input
              id="code"
              inputMode="text"
              autoCapitalize="characters"
              value={masked}
              aria-invalid={!isValid && codeValue.length > 0}
              aria-describedby="code-help code-error"
              onChange={(e) => {
                const sanitized = sanitizeInviteCodeInput(e.target.value);
                form.setValue("code", sanitized, { shouldValidate: true, shouldDirty: true });
              }}
            />
            <p id="code-help" className="text-xs text-muted-foreground">Dozwolone litery i cyfry, bez I, O, l, 0. Przykład: ABCD1234</p>
            {!isValid && codeValue.length > 0 ? (
              <p id="code-error" className="text-xs text-destructive">Kod musi mieć dokładnie 8 znaków.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Anuluj</Button>
            <Button type="submit" disabled={loading || !isValid} aria-disabled={loading || !isValid}>{loading ? "Dołączanie…" : "Dołącz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


