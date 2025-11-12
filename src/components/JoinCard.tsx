import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { UUID } from "@/types";
import { Loader2 } from "lucide-react";
import { useJoinGroup } from "@/lib/useJoinGroup";
import {
  sanitizeInviteCodeInput,
  isValidInviteCode,
  formatInviteCodeMasked,
  INVITE_CODE_ALLOWED_CHAR,
} from "@/lib/validation/join";

interface JoinCardProps {
  initialCode?: string;
}

export default function JoinCard(props: JoinCardProps) {
  const [currentCode, setCurrentCode] = useState<string>(props.initialCode ?? "");

  const handleSuccess = useCallback((groupId: UUID) => {
    window.location.assign(`/groups/${groupId}/dashboard`);
  }, []);

  return (
    <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-950 p-6 shadow-sm md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dołącz do grupy</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Wpisz 8‑znakowy kod zaproszenia, aby dołączyć do grupy HAL.
        </p>
      </header>

      <div className="grid gap-6">
        <JoinForm initialCode={props.initialCode} onCodeChange={setCurrentCode} onSuccess={handleSuccess} />
        <CopyDeepLink code={currentCode} />
      </div>
    </div>
  );
}

// =====================
// JoinForm
// =====================
interface JoinFormProps {
  initialCode?: string;
  onCodeChange?: (rawCode: string) => void;
  onSuccess: (groupId: UUID) => void;
}

type GeneralErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR" | "INTERNAL_ERROR" | "BAD_REQUEST";

type InviteErrorCode = "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_MAXED" | "ALREADY_MEMBER";

type JoinErrorCode = InviteErrorCode | GeneralErrorCode;

function JoinForm(props: JoinFormProps) {
  const [code, setCode] = useState<string>(sanitizeInviteCodeInput(props.initialCode ?? ""));
  const [isValid, setIsValid] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<JoinErrorCode | undefined>(undefined);
  const [successAnnounce, setSuccessAnnounce] = useState<string | undefined>(undefined);

  const alertId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const { joinByCode, isSubmitting, error, resetError } = useJoinGroup();

  useEffect(() => {
    if (props.onCodeChange) props.onCodeChange(code);
  }, [code, props]);

  useEffect(() => {
    if (submitError && alertRef.current) {
      alertRef.current.focus();
    }
  }, [submitError]);

  useEffect(() => {
    const sanitized = sanitizeInviteCodeInput(code);
    setIsValid(isValidInviteCode(sanitized));
  }, [code]);

  useEffect(() => {
    if (!props.initialCode) return;
    const sanitized = sanitizeInviteCodeInput(props.initialCode);
    if (isValidInviteCode(sanitized)) {
      submitRef.current?.focus();
    }
  }, [props.initialCode]);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitError(undefined);
      setSuccessAnnounce(undefined);

      const raw = sanitizeInviteCodeInput(code);
      if (!isValidInviteCode(raw)) {
        setSubmitError("VALIDATION_ERROR");
        return;
      }

      const result = await joinByCode(raw);
      if (result.ok) {
        setSuccessAnnounce("Dołączono. Przekierowuję...");
        props.onSuccess(result.groupId);
        return;
      }
      setSubmitError(result.code as JoinErrorCode);
    },
    [code, joinByCode, props]
  );

  const validationMessage = useMemo(() => {
    if (!code) return undefined;
    const raw = sanitizeInviteCodeInput(code);
    if (raw.length < 8) return "Kod powinien mieć 8 znaków.";
    if (raw.length > 8) return "Kod jest za długi (maks. 8 znaków).";
    if (!isValidInviteCode(raw)) return "Kod zawiera niedozwolone znaki.";
    return undefined;
  }, [code]);

  const errorMessage = useMemo(
    () => mapErrorToMessage(submitError ?? error ?? undefined, code),
    [submitError, error, code]
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-labelledby={alertId}>
      {errorMessage ? (
        <div
          id={alertId}
          ref={alertRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : (
        <div id={alertId} className="sr-only" aria-live="polite" />
      )}

      {successAnnounce ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {successAnnounce}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="invite-code" className="text-sm font-medium">
          Kod zaproszenia
        </label>
        <CodeMaskedInput
          value={code}
          onValue={(raw) => {
            resetError();
            setSubmitError(undefined);
            setCode(raw);
          }}
          disabled={isSubmitting}
          invalid={!isValid && sanitizeInviteCodeInput(code).length > 0}
          describedById={validationMessage ? `${alertId}-desc` : undefined}
        />
        {validationMessage ? (
          <p id={`${alertId}-desc`} className="text-xs text-neutral-500 dark:text-neutral-400">
            {validationMessage}
          </p>
        ) : null}
      </div>

      <Button
        ref={submitRef}
        type="submit"
        disabled={!isValid || isSubmitting}
        aria-disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Dołączanie...
          </span>
        ) : (
          "Dołącz"
        )}
      </Button>
    </form>
  );
}

// =====================
// CodeMaskedInput (basic step; full mask/regExp in step 4)
// =====================
interface CodeMaskedInputProps {
  value: string;
  onValue: (raw: string) => void;
  disabled?: boolean;
  describedById?: string;
  invalid?: boolean;
}

function CodeMaskedInput(props: CodeMaskedInputProps) {
  const displayValue = useMemo(() => formatInviteCodeMasked(props.value), [props.value]);

  return (
    <input
      id="invite-code"
      type="text"
      inputMode="latin"
      autoCapitalize="characters"
      autoComplete="one-time-code"
      value={displayValue}
      onChange={(e) => props.onValue(sanitizeInviteCodeInput(e.target.value))}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        props.onValue(sanitizeInviteCodeInput(text));
      }}
      onKeyDown={(e) => {
        const k = e.key;
        const meta = e.ctrlKey || e.metaKey || e.altKey;
        if (meta) return;
        const allowedControl =
          k === "Backspace" ||
          k === "Delete" ||
          k === "ArrowLeft" ||
          k === "ArrowRight" ||
          k === "Tab" ||
          k === "Home" ||
          k === "End" ||
          k === "Enter";
        if (allowedControl) return;
        if (k.length === 1 && !INVITE_CODE_ALLOWED_CHAR.test(k)) {
          e.preventDefault();
        }
      }}
      aria-describedby={props.describedById}
      aria-invalid={props.invalid ?? false}
      disabled={props.disabled}
      className="w-full rounded-md border bg-transparent px-3 py-2 text-base outline-none ring-0 placeholder:text-neutral-400 focus-visible:border-neutral-400 dark:focus-visible:border-neutral-500"
      placeholder="ABCD EFGH"
    />
  );
}

// =====================
// JoinStatus (kept minimal; we expose state via messages above button)
// =====================
interface JoinStatusProps {
  status: "idle" | "submitting" | "error";
  message?: string;
}

function JoinStatus(props: JoinStatusProps) {
  return (
    <div aria-live="polite" className="sr-only">
      {props.message ?? (props.status === "submitting" ? "Wysyłanie..." : undefined)}
    </div>
  );
}

// =====================
// CopyDeepLink
// =====================
interface CopyDeepLinkProps {
  code?: string;
}

function CopyDeepLink(props: CopyDeepLinkProps) {
  const [info, setInfo] = useState<string | undefined>(undefined);
  const hasValidCode = useMemo(() => isValidInviteCode(sanitizeInviteCodeInput(props.code ?? "")), [props.code]);
  const link = useMemo(() => {
    const raw = sanitizeInviteCodeInput(props.code ?? "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/join?code=${raw}`;
  }, [props.code]);

  const copyText = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setInfo("Skopiowano do schowka.");
      setTimeout(() => setInfo(undefined), 2000);
    } catch {
      setInfo("Nie udało się skopiować.");
      setTimeout(() => setInfo(undefined), 2000);
    }
  }, []);

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="w-full rounded-md border bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300"
        />
        <Button type="button" variant="outline" disabled={!hasValidCode} onClick={() => copyText(link)}>
          Kopiuj link
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasValidCode}
          onClick={() => copyText(sanitizeInviteCodeInput(props.code ?? ""))}
        >
          Kopiuj kod
        </Button>
      </div>
      <JoinStatus status="idle" message={info} />
      {info ? (
        <div aria-live="polite" className="text-xs text-neutral-500 dark:text-neutral-400">
          {info}
        </div>
      ) : null}
    </div>
  );
}

// =====================
// Error message mapping
// =====================

function mapErrorToMessage(code: JoinErrorCode | undefined, enteredCode: string): ReactNode | undefined {
  if (!code) return undefined;
  switch (code) {
    case "INVITE_INVALID":
      return "Nieprawidłowy kod zaproszenia. Sprawdź i spróbuj ponownie.";
    case "INVITE_EXPIRED":
      return "Kod zaproszenia wygasł. Poproś administratora o nowy kod.";
    case "INVITE_MAXED":
      return "Limit użyć kodu został wyczerpany.";
    case "ALREADY_MEMBER":
      return "Jesteś już członkiem tej grupy.";
    case "UNAUTHORIZED": {
      const raw = sanitizeInviteCodeInput(enteredCode);
      const href = `/login?redirect=${encodeURIComponent(`/join?code=${raw}`)}`;
      return (
        <span>
          Zaloguj się, aby dołączyć do grupy.{" "}
          <a className="text-primary underline" href={href}>
            Przejdź do logowania
          </a>
          .
        </span>
      );
    }
    case "VALIDATION_ERROR":
    case "BAD_REQUEST":
      return "Nieprawidłowe żądanie.";
    case "INTERNAL_ERROR":
      return "Wystąpił błąd. Spróbuj ponownie później.";
    default:
      return "Wystąpił błąd. Spróbuj ponownie.";
  }
}
