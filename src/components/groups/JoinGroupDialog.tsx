import * as React from "react";
import { useForm } from "react-hook-form";
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
import { sanitizeInviteCodeInput, isValidInviteCode } from "@/lib/validation/join";
import { useJoinGroup } from "@/lib/groups/useJoinGroup";

export interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJoined?: () => void;
}

interface FormValues {
  code: string;
}

export function JoinGroupDialog({ open, onOpenChange, onJoined }: JoinGroupDialogProps): JSX.Element {
  const { join, loading, error } = useJoinGroup();
  const [serverCode, setServerCode] = React.useState<string | undefined>(undefined);

  const form = useForm<FormValues>({
    defaultValues: { code: "" },
    mode: "onChange",
  });

  const codeValue = form.watch("code");
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
    const code = (res.error as { code?: string })?.code;
    setServerCode(code);
    if (code === "INVITE_INVALID") {
      form.setError("code", { type: "server", message: "Nieprawidłowy kod zaproszenia." });
    } else if (code === "INVITE_EXPIRED") {
      form.setError("code", { type: "server", message: "Kod zaproszenia wygasł." });
    } else if (code === "INVITE_MAXED") {
      form.setError("code", { type: "server", message: "Wykorzystano maksymalną liczbę użyć kodu." });
    } else if (code === "ALREADY_MEMBER") {
      form.setError("code", { type: "server", message: "Jesteś już członkiem tej grupy." });
    } else if (code === "NOT_FOUND") {
      form.setError("code", { type: "server", message: "Nie znaleziono grupy dla tego kodu." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby="join-title" aria-describedby="join-desc" data-test-id="groups-join-dialog">
        <DialogHeader>
          <DialogTitle id="join-title">Dołącz do grupy</DialogTitle>
          <DialogDescription id="join-desc">Wpisz 8-znakowy kod zaproszenia.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" aria-busy={loading}>
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm"
              data-test-id="groups-join-error-message"
            >
              {serverCode === "RATE_LIMIT_EXCEEDED" ? "Przekroczono limit żądań. Spróbuj ponownie za chwilę." : error}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="code">Kod zaproszenia</Label>
            <Input
              id="code"
              inputMode="text"
              autoCapitalize="characters"
              value={codeValue}
              aria-invalid={!isValid && codeValue.length > 0}
              aria-describedby="code-help code-error"
              data-test-id="groups-join-code-input"
              onChange={(e) => {
                const sanitized = sanitizeInviteCodeInput(e.target.value);
                form.setValue("code", sanitized, { shouldValidate: true, shouldDirty: true });
              }}
            />
            <p id="code-help" className="text-xs text-muted-foreground">
              Dozwolone litery i cyfry, bez I, O, l, 0. Przykład: ABCD1234
            </p>
            {!isValid && codeValue.length > 0 ? (
              <p id="code-error" className="text-xs text-destructive">
                Kod musi mieć dokładnie 8 znaków.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              data-test-id="groups-join-cancel-button"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValid}
              aria-disabled={loading || !isValid}
              data-test-id="groups-join-submit-button"
            >
              {loading ? "Dołączanie…" : "Dołącz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
