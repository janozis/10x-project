import * as React from "react";
import { z } from "zod";
import type { ApiErrorCode, CampDayCreateCommand, CampDayDTO, DateISO, UUID } from "@/types";
import { useGroupSettings } from "@/lib/useGroupSettings";
import { createCampDay } from "@/lib/camp-days/api.client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type RedirectMode = "detail" | "list";

interface CampDayCreateFormProps {
  groupId: UUID;
  defaultRedirect?: RedirectMode;
}

interface CampDayCreateVM {
  dayNumber: number | "";
  date: DateISO | "";
  theme: string;
  redirect: RedirectMode;
}

interface CampDayFormErrors {
  dayNumber?: string;
  date?: string;
  theme?: string;
  _form?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_THEME_LENGTH = 280;

const dayNumberSchema = z
  .number({ required_error: "Podaj numer dnia." })
  .int({ message: "Numer dnia musi być liczbą całkowitą." })
  .min(1, "Numer dnia musi być liczbą od 1 do 30.")
  .max(30, "Numer dnia musi być liczbą od 1 do 30.");

const dateSchema = z.string({ required_error: "Wybierz datę." }).regex(DATE_REGEX, "Data musi mieć format YYYY-MM-DD.");

const themeSchema = z.string().trim().max(MAX_THEME_LENGTH, `Temat może mieć maksymalnie ${MAX_THEME_LENGTH} znaków.`);

function mapApiErrorCodeToMessage(code: ApiErrorCode | undefined, fallback: string): string {
  switch (code) {
    case "DAY_OUT_OF_RANGE":
      return "Numer dnia jest poza dozwolonym zakresem.";
    case "DATE_OUT_OF_GROUP_RANGE":
      return "Data nie mieści się w zakresie planu obozu.";
    case "DUPLICATE_DAY_NUMBER":
      return "Dzień o tym numerze został już utworzony.";
    case "FORBIDDEN_ROLE":
    case "UNAUTHORIZED":
      return "Nie masz uprawnień do wykonania tej operacji.";
    case "NOT_FOUND":
      return "Nie znaleziono wybranej grupy.";
    default:
      return fallback;
  }
}

function extractDetail(details: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!details) return undefined;
  const value = details[key];
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    if (typeof first === "string") return first;
  }
  return undefined;
}

function validateViewModel(
  vm: CampDayCreateVM,
  range: { min?: DateISO; max?: DateISO }
): { errors: CampDayFormErrors; command?: CampDayCreateCommand } {
  const nextErrors: CampDayFormErrors = {};

  const parsedDay = vm.dayNumber === "" ? undefined : vm.dayNumber;
  const dayResult = dayNumberSchema.safeParse(parsedDay);
  if (!dayResult.success) {
    nextErrors.dayNumber = dayResult.error.issues[0]?.message ?? "Nieprawidłowy numer dnia.";
  }

  const dateResult = dateSchema.safeParse(vm.date === "" ? undefined : vm.date);
  if (!dateResult.success) {
    nextErrors.date = dateResult.error.issues[0]?.message ?? "Nieprawidłowa data.";
  } else {
    if (range.min && dateResult.data < range.min) {
      nextErrors.date = `Data nie może być wcześniejsza niż ${range.min}.`;
    } else if (range.max && dateResult.data > range.max) {
      nextErrors.date = `Data nie może być późniejsza niż ${range.max}.`;
    }
  }

  const trimmedTheme = vm.theme.trim();
  let normalizedTheme: string | undefined;
  if (trimmedTheme.length > 0) {
    const themeResult = themeSchema.safeParse(trimmedTheme);
    if (!themeResult.success) {
      nextErrors.theme =
        themeResult.error.issues[0]?.message ?? `Temat może mieć maksymalnie ${MAX_THEME_LENGTH} znaków.`;
    } else {
      normalizedTheme = themeResult.data;
    }
  }

  if (nextErrors.dayNumber || nextErrors.date || nextErrors.theme) {
    return { errors: nextErrors };
  }

  const command: CampDayCreateCommand = {
    day_number: dayResult.data!,
    date: dateResult.data!,
  };
  if (normalizedTheme) {
    command.theme = normalizedTheme;
  }

  return { errors: {}, command };
}

export default function CampDayCreateForm({
  groupId,
  defaultRedirect = "detail",
}: CampDayCreateFormProps): JSX.Element {
  const { loading, error, group, permissions, refresh } = useGroupSettings(groupId);

  const id = React.useId();
  const [vm, setVm] = React.useState<CampDayCreateVM>({
    dayNumber: "",
    date: "",
    theme: "",
    redirect: defaultRedirect,
  });
  const [errorsState, setErrorsState] = React.useState<CampDayFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const submitModeRef = React.useRef<RedirectMode>(defaultRedirect);

  const dayNumberRef = React.useRef<HTMLInputElement>(null);
  const dateRef = React.useRef<HTMLInputElement>(null);
  const themeRef = React.useRef<HTMLTextAreaElement>(null);

  const updateRedirectParam = React.useCallback((mode: RedirectMode) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("redirect", mode);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const selectRedirectMode = React.useCallback(
    (mode: RedirectMode) => {
      submitModeRef.current = mode;
      setVm((state) => (state.redirect === mode ? state : { ...state, redirect: mode }));
      updateRedirectParam(mode);
    },
    [updateRedirectParam]
  );

  React.useEffect(() => {
    if (errorsState.dayNumber && dayNumberRef.current) {
      dayNumberRef.current.focus();
      return;
    }
    if (errorsState.date && dateRef.current) {
      dateRef.current.focus();
      return;
    }
    if (errorsState.theme && themeRef.current) {
      themeRef.current.focus();
    }
  }, [errorsState]);

  React.useEffect(() => {
    selectRedirectMode(defaultRedirect);
  }, [defaultRedirect, selectRedirectMode]);

  const canManage = permissions?.role === "admin";

  const dateRange = React.useMemo(
    () => ({
      min: group?.start_date,
      max: group?.end_date,
    }),
    [group?.start_date, group?.end_date]
  );

  const dateRangeHelper = React.useMemo(() => {
    if (group?.start_date && group?.end_date) {
      return `Zakres: ${group.start_date} – ${group.end_date}`;
    }
    if (group?.start_date) {
      return `Najwcześniejsza data: ${group.start_date}`;
    }
    if (group?.end_date) {
      return `Najpóźniejsza data: ${group.end_date}`;
    }
    return undefined;
  }, [group?.start_date, group?.end_date]);

  const handleDayNumberChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setVm((state) => ({
      ...state,
      dayNumber: Number.isNaN(event.target.valueAsNumber) ? "" : event.target.valueAsNumber,
    }));
    setErrorsState((prev) => ({ ...prev, dayNumber: undefined }));
  }, []);

  const handleDateChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setVm((state) => ({ ...state, date: event.target.value as DateISO | "" }));
    setErrorsState((prev) => ({ ...prev, date: undefined }));
  }, []);

  const handleThemeChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVm((state) => ({ ...state, theme: event.target.value }));
    setErrorsState((prev) => ({ ...prev, theme: undefined }));
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!group) {
        toast.error("Nie udało się pobrać danych grupy. Odśwież stronę i spróbuj ponownie.");
        return;
      }

      setErrorsState({});

      const validation = validateViewModel(vm, dateRange);
      if (!validation.command) {
        setErrorsState(validation.errors);
        return;
      }

      setSubmitting(true);
      const redirectMode = submitModeRef.current ?? vm.redirect;

      try {
        const response = await createCampDay(groupId, validation.command);
        if (!response || typeof response !== "object") {
          setErrorsState({
            _form: "Serwer zwrócił nieprawidłową odpowiedź. Spróbuj ponownie później.",
          });
          return;
        }
        if ("error" in response) {
          const apiError = response.error;
          const nextErrors: CampDayFormErrors = {};
          const details = apiError.details as Record<string, unknown> | undefined;

          if (apiError.code === "VALIDATION_ERROR" && details) {
            const dayDetail = extractDetail(details, "day_number");
            if (dayDetail) nextErrors.dayNumber = dayDetail;
            const dateDetail = extractDetail(details, "date");
            if (dateDetail) nextErrors.date = dateDetail;
            const themeDetail = extractDetail(details, "theme");
            if (themeDetail) nextErrors.theme = themeDetail;
          } else if (apiError.code === "DAY_OUT_OF_RANGE") {
            nextErrors.dayNumber = "Numer dnia jest poza dozwolonym zakresem.";
          } else if (apiError.code === "DATE_OUT_OF_GROUP_RANGE") {
            nextErrors.date =
              group.start_date && group.end_date
                ? `Data musi mieścić się w zakresie ${group.start_date} – ${group.end_date}.`
                : "Data jest poza zakresem grupy.";
          } else if (apiError.code === "DUPLICATE_DAY_NUMBER") {
            nextErrors.dayNumber = "Ten numer dnia jest już wykorzystany.";
            nextErrors._form = apiError.message ?? "Nie można utworzyć dnia o zdublowanym numerze.";
          } else {
            const message = mapApiErrorCodeToMessage(
              apiError.code,
              apiError.message || "Nie udało się utworzyć dnia obozowego."
            );
            nextErrors._form = message;
            if (apiError.code === "FORBIDDEN_ROLE" || apiError.code === "UNAUTHORIZED") {
              toast.error(message);
            }
          }

          if (!nextErrors._form && apiError.message) {
            nextErrors._form = apiError.message;
          }

          setErrorsState(nextErrors);
          return;
        }

        if (!("data" in response) || !response.data) {
          setErrorsState({
            _form: "Brak danych utworzonego dnia w odpowiedzi serwera.",
          });
          return;
        }

        const created: CampDayDTO = response.data;
        const targetUrl =
          redirectMode === "detail" ? `/groups/${groupId}/camp-days/${created.id}` : `/groups/${groupId}/camp-days`;
        toast.success("Dzień obozowy został utworzony.");
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(
              "campDayCreateSuccess",
              JSON.stringify({
                message: "Dzień obozowy został utworzony.",
                redirect: redirectMode,
                campDayId: created.id,
                at: Date.now(),
              })
            );
          } catch {
            // Ignore storage failures (private mode / quota)
          }
        }
        setTimeout(() => {
          window.location.assign(targetUrl);
        }, 300);
      } catch (err: any) {
        const apiError = err?.body?.error as
          | { code?: ApiErrorCode; message?: string; details?: Record<string, unknown> }
          | undefined;
        const status = err?.status as number | undefined;
        const fallbackMessage =
          status && status >= 500
            ? "Serwer napotkał błąd. Spróbuj ponownie później."
            : "Wystąpił problem podczas tworzenia dnia obozowego.";
        const message = mapApiErrorCodeToMessage(apiError?.code, apiError?.message || fallbackMessage);
        const nextErrors: CampDayFormErrors = { _form: message };

        if (apiError?.code === "VALIDATION_ERROR" && apiError.details) {
          const dayDetail = extractDetail(apiError.details, "day_number");
          if (dayDetail) nextErrors.dayNumber = dayDetail;
          const dateDetail = extractDetail(apiError.details, "date");
          if (dateDetail) nextErrors.date = dateDetail;
          const themeDetail = extractDetail(apiError.details, "theme");
          if (themeDetail) nextErrors.theme = themeDetail;
        } else if (apiError?.code === "DUPLICATE_DAY_NUMBER") {
          nextErrors.dayNumber = "Ten numer dnia jest już wykorzystany.";
        }

        setErrorsState(nextErrors);
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [dateRange, group, groupId, vm]
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-20 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-28 w-full rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        {error}
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
            }}
          >
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div role="status" className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        Nie udało się załadować danych grupy.
      </div>
    );
  }

  if (!canManage) {
    return (
      <section
        className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-6 text-center"
        role="alert"
        aria-live="polite"
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Brak uprawnień</h2>
          <p className="text-sm text-muted-foreground">
            Tylko administratorzy mogą dodawać nowe dni obozowe w tej grupie.
          </p>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <a href={`/groups/${groupId}/camp-days`}>Wróć do listy dni</a>
          </Button>
        </div>
      </section>
    );
  }

  const dayNumberErrorId = `${id}-day-number-error`;
  const dateErrorId = `${id}-date-error`;
  const themeErrorId = `${id}-theme-error`;

  return (
    <form className="space-y-8" noValidate onSubmit={handleSubmit} aria-busy={submitting ? "true" : undefined}>
      {errorsState._form ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorsState._form}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-day-number`}>Numer dnia *</Label>
          <Input
            id={`${id}-day-number`}
            ref={dayNumberRef}
            type="number"
            min={1}
            max={30}
            step={1}
            value={vm.dayNumber === "" ? "" : vm.dayNumber}
            onChange={handleDayNumberChange}
            aria-invalid={errorsState.dayNumber ? "true" : undefined}
            aria-describedby={errorsState.dayNumber ? dayNumberErrorId : undefined}
            inputMode="numeric"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">Wartość 1–30, zgodna z kolejnością dni obozu.</p>
          {errorsState.dayNumber ? (
            <p id={dayNumberErrorId} role="alert" aria-live="assertive" className="text-xs text-destructive">
              {errorsState.dayNumber}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-date`}>Data dnia *</Label>
          <Input
            id={`${id}-date`}
            ref={dateRef}
            type="date"
            value={vm.date}
            onChange={handleDateChange}
            min={dateRange.min}
            max={dateRange.max}
            aria-invalid={errorsState.date ? "true" : undefined}
            aria-describedby={errorsState.date ? dateErrorId : undefined}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">{dateRangeHelper ?? "Wybierz datę w formacie YYYY-MM-DD."}</p>
          {errorsState.date ? (
            <p id={dateErrorId} role="alert" aria-live="assertive" className="text-xs text-destructive">
              {errorsState.date}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-theme`}>Temat dnia (opcjonalnie)</Label>
        <Textarea
          id={`${id}-theme`}
          ref={themeRef}
          value={vm.theme}
          onChange={handleThemeChange}
          maxLength={MAX_THEME_LENGTH}
          aria-invalid={errorsState.theme ? "true" : undefined}
          aria-describedby={errorsState.theme ? themeErrorId : undefined}
          disabled={submitting}
          rows={5}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Krótki opis motywu lub atrakcji dnia.</span>
          <span>
            {vm.theme.length}/{MAX_THEME_LENGTH}
          </span>
        </div>
        {errorsState.theme ? (
          <p id={themeErrorId} role="alert" aria-live="assertive" className="text-xs text-destructive">
            {errorsState.theme}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} onClick={() => selectRedirectMode("detail")}>
            {submitting && submitModeRef.current === "detail" ? <Loader2 className="animate-spin" /> : null}
            Utwórz i przejdź do dnia
          </Button>
          <Button
            type="submit"
            variant="secondary"
            disabled={submitting}
            onClick={() => selectRedirectMode("list")}
          >
            {submitting && submitModeRef.current === "list" ? <Loader2 className="animate-spin" /> : null}
            Utwórz i wróć do listy
          </Button>
        </div>
        <Button
          variant="ghost"
          type="button"
          disabled={submitting}
          onClick={() => {
            if (submitting) return;
            window.location.assign(`/groups/${groupId}/camp-days`);
          }}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}
