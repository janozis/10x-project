import * as React from "react";
import { z } from "zod";
import type {
  ApiError,
  ApiErrorCode,
  CampDayDTO,
  CampDayUpdateCommand,
  DateISO,
  GroupPermissionsDTO,
  UUID,
  WithMeta,
} from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SaveStatusBar } from "@/components/camp-days/SaveStatusBar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCampDayWithMeta, patchCampDayWithIfMatch } from "@/lib/camp-days/api.client";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_THEME_LENGTH = 280;

interface CampDayEditFormValues {
  date: DateISO;
  theme: string;
}

interface CampDayEditFormErrors {
  date?: string;
  theme?: string;
  _form?: string;
}

export interface GroupDateRange {
  startDate: DateISO;
  endDate: DateISO;
}

export interface CampDayEditFormProps {
  groupId: UUID;
  campDay: CampDayDTO;
  permissions?: GroupPermissionsDTO | null;
  groupDateRange?: GroupDateRange;
  etag?: string;
}

const themeSchema = z
  .string()
  .max(MAX_THEME_LENGTH, `Temat może mieć maksymalnie ${MAX_THEME_LENGTH} znaków.`)
  .optional()
  .transform((value) => (value ?? "").trim());

const buildSchema = (range?: GroupDateRange) =>
  z.object({
    date: z
      .string({ required_error: "Podaj datę dnia." })
      .regex(DATE_REGEX, "Data musi mieć format YYYY-MM-DD.")
      .superRefine((value, ctx) => {
        if (!range) return;
        if (value < range.startDate || value > range.endDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Data musi mieścić się w zakresie ${range.startDate} – ${range.endDate}.`,
          });
        }
      }),
    theme: themeSchema,
  });

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

function mapApiErrorCodeToMessage(code: ApiErrorCode | undefined, fallback: string, range?: GroupDateRange): string {
  switch (code) {
    case "DATE_OUT_OF_GROUP_RANGE":
      if (range) {
        return `Data musi mieścić się w zakresie ${range.startDate} – ${range.endDate}.`;
      }
      return "Wybrana data jest poza zakresem tej grupy.";
    case "FORBIDDEN_ROLE":
      return "Nie masz uprawnień administratora, aby edytować dzień obozowy.";
    case "UNAUTHORIZED":
      return "Musisz być zalogowany, aby zapisać zmiany.";
    case "NOT_FOUND":
      return "Dzień obozowy nie został znaleziony.";
    case "CONFLICT":
      return "Wykryto konflikt wersji – odśwież dane i spróbuj ponownie.";
    default:
      return fallback;
  }
}

function formatDateRangeHelper(range?: GroupDateRange): string | undefined {
  if (!range) return undefined;
  return `Zakres: ${range.startDate} – ${range.endDate}`;
}

function normalizeTheme(theme: string): string {
  return theme.trim();
}

function createPayload(current: CampDayEditFormValues, baseline: CampDayEditFormValues): CampDayUpdateCommand | null {
  const normalizedTheme = normalizeTheme(current.theme);
  const payload: CampDayUpdateCommand = {};

  if (current.date !== baseline.date) {
    payload.date = current.date;
  }
  if (normalizedTheme !== baseline.theme) {
    payload.theme = normalizedTheme === "" ? null : normalizedTheme;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export default function CampDayEditForm({
  groupId,
  campDay,
  permissions,
  groupDateRange,
  etag: initialEtag,
}: CampDayEditFormProps): JSX.Element {
  const schema = React.useMemo(() => buildSchema(groupDateRange), [groupDateRange]);
  const id = React.useId();

  const initialSnapshot = React.useMemo<CampDayEditFormValues>(
    () => ({
      date: campDay.date,
      theme: normalizeTheme(campDay.theme ?? ""),
    }),
    [campDay.date, campDay.theme]
  );

  const [values, setValues] = React.useState<CampDayEditFormValues>(initialSnapshot);
  const [baseline, setBaseline] = React.useState<CampDayEditFormValues>(initialSnapshot);
  const [errors, setErrors] = React.useState<CampDayEditFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = React.useState<string | undefined>(undefined);
  const [etag, setEtag] = React.useState<string | undefined>(initialEtag);

  const canEdit = permissions?.role === "admin";

  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const themeRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setValues(initialSnapshot);
    setBaseline(initialSnapshot);
    setErrors({});
    setSaveState("idle");
    setSaveMessage(undefined);
    setEtag(initialEtag);
  }, [initialSnapshot, initialEtag]);

  const isDirty = React.useMemo(() => {
    return values.date !== baseline.date || values.theme !== baseline.theme;
  }, [values, baseline]);

  React.useEffect(() => {
    if (errors.date && dateInputRef.current) {
      dateInputRef.current.focus();
      return;
    }
    if (errors.theme && themeRef.current) {
      themeRef.current.focus();
    }
  }, [errors]);

  const handleDateChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value as DateISO;
    setValues((state) => ({ ...state, date: next }));
    setErrors((prev) => ({ ...prev, date: undefined, _form: undefined }));
  }, []);

  const handleThemeChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValues((state) => ({ ...state, theme: event.target.value }));
    setErrors((prev) => ({ ...prev, theme: undefined, _form: undefined }));
  }, []);

  const resetToBaseline = React.useCallback(() => {
    setValues(baseline);
    setErrors({});
    setSaveState("idle");
    setSaveMessage(undefined);
  }, [baseline]);

  const navigateBack = React.useCallback(() => {
    const target = `/groups/${groupId}/camp-days/${campDay.id}`;
    window.location.assign(target);
  }, [groupId, campDay.id]);

  const applyApiError = React.useCallback(
    async (error: ApiError, payloadWasConflict: boolean) => {
      const { code, message, details } = error.error;
      const nextErrors: CampDayEditFormErrors = {};
      if (code === "VALIDATION_ERROR" && details) {
        const dateDetail = extractDetail(details, "date");
        if (dateDetail) nextErrors.date = dateDetail;
        const themeDetail = extractDetail(details, "theme");
        if (themeDetail) nextErrors.theme = themeDetail;
      }

      if (!nextErrors.date && code === "DATE_OUT_OF_GROUP_RANGE") {
        nextErrors.date = mapApiErrorCodeToMessage(code, message ?? "Data jest poza zakresem grupy.", groupDateRange);
      }
      if (!nextErrors._form) {
        nextErrors._form = mapApiErrorCodeToMessage(
          code,
          message || "Nie udało się zapisać zmian dnia obozowego.",
          groupDateRange
        );
      }

      setErrors(nextErrors);
      setSaveState("error");
      setSaveMessage(nextErrors._form);

      if (code === "CONFLICT" || payloadWasConflict) {
        toast.error(nextErrors._form);
        const fresh = await getCampDayWithMeta(campDay.id);
        if ("error" in (fresh as any)) {
          return;
        }
        const success = fresh as WithMeta<CampDayDTO>;
        const nextBaseline: CampDayEditFormValues = {
          date: success.data.date,
          theme: normalizeTheme(success.data.theme ?? ""),
        };
        setBaseline(nextBaseline);
        setValues(nextBaseline);
        setEtag(success._meta?.etag ?? undefined);
      } else {
        toast.error(nextErrors._form ?? "Nie udało się zapisać zmian.");
      }
    },
    [campDay.id, groupDateRange]
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrors({});

      if (!canEdit) {
        toast.error("Tylko administratorzy mogą zapisywać zmiany.");
        setSaveState("error");
        setSaveMessage("Brak uprawnień do zapisu.");
        return;
      }

      const validation = schema.safeParse(values);
      if (!validation.success) {
        const issues = validation.error.flatten().fieldErrors;
        const nextErrors: CampDayEditFormErrors = {};
        if (issues.date?.[0]) nextErrors.date = issues.date[0];
        if (issues.theme?.[0]) nextErrors.theme = issues.theme[0];
        nextErrors._form = "Popraw błędy formularza.";
        setErrors(nextErrors);
        setSaveState("error");
        setSaveMessage(nextErrors._form);
        return;
      }

      const payload = createPayload(validation.data, baseline);
      if (!payload) {
        toast.info("Brak zmian do zapisania.");
        setSaveState("idle");
        setSaveMessage(undefined);
        return;
      }

      setSubmitting(true);
      setSaveState("saving");
      setSaveMessage(undefined);

      try {
        const response = await patchCampDayWithIfMatch(campDay.id, payload, etag);
        if ("error" in (response as any)) {
          const apiError = response as ApiError;
          await applyApiError(apiError, apiError.error.code === "CONFLICT");
          return;
        }

        const ok = response as WithMeta<CampDayDTO>;
        const nextBaseline: CampDayEditFormValues = {
          date: ok.data.date,
          theme: normalizeTheme(ok.data.theme ?? ""),
        };
        setBaseline(nextBaseline);
        setValues(nextBaseline);
        setEtag(ok._meta?.etag ?? undefined);
        setSaveState("saved");
        setSaveMessage("Zapisano zmiany.");

        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(
              "campDayEditSuccess",
              JSON.stringify({
                message: "Zapisano zmiany dnia obozowego.",
                campDayId: ok.data.id,
                at: Date.now(),
              })
            );
          } catch {
            // ignore storage errors (e.g. private mode)
          }
        }

        toast.success("Zapisano zmiany dnia obozowego.");

        window.setTimeout(() => {
          navigateBack();
        }, 400);
      } catch (error: unknown) {
        const apiError = (error as any)?.body as ApiError | undefined;
        const status = (error as any)?.status as number | undefined;
        if (apiError?.error) {
          await applyApiError(apiError, apiError.error.code === "CONFLICT");
        } else {
          const fallback =
            status && status >= 500
              ? "Serwer napotkał błąd. Spróbuj ponownie później."
              : "Wystąpił problem podczas zapisywania zmian.";
          setErrors({ _form: fallback });
          setSaveState("error");
          setSaveMessage(fallback);
          toast.error(fallback);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [applyApiError, baseline, campDay.id, canEdit, etag, navigateBack, schema, values]
  );

  const dateErrorId = `${id}-date-error`;
  const themeErrorId = `${id}-theme-error`;

  return (
    <form className="space-y-8" onSubmit={handleSubmit} noValidate aria-busy={submitting ? "true" : undefined}>
      {!canEdit ? (
        <div role="alert" className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900">
          Tylko administratorzy mogą edytować dzień obozowy. Możesz przeglądać szczegóły, ale nie zapiszesz zmian.
        </div>
      ) : null}

      {errors._form ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errors._form}
        </div>
      ) : null}

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor={`${id}-date`}>Data dnia *</Label>
          <Input
            id={`${id}-date`}
            ref={dateInputRef}
            type="date"
            value={values.date}
            onChange={handleDateChange}
            min={groupDateRange?.startDate}
            max={groupDateRange?.endDate}
            aria-invalid={errors.date ? "true" : undefined}
            aria-describedby={errors.date ? dateErrorId : undefined}
            disabled={submitting || !canEdit}
          />
          <p className="text-xs text-muted-foreground">
            {formatDateRangeHelper(groupDateRange) ?? "Wybierz datę w formacie YYYY-MM-DD."}
          </p>
          {errors.date ? (
            <p id={dateErrorId} role="alert" className="text-xs text-destructive">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-theme`}>Temat dnia (opcjonalnie)</Label>
          <Textarea
            id={`${id}-theme`}
            ref={themeRef}
            rows={5}
            value={values.theme}
            onChange={handleThemeChange}
            maxLength={MAX_THEME_LENGTH}
            aria-invalid={errors.theme ? "true" : undefined}
            aria-describedby={errors.theme ? themeErrorId : undefined}
            disabled={submitting || !canEdit}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Krótki opis motywu dnia. Pozostaw puste, aby usunąć temat.</span>
            <span>
              {values.theme.length}/{MAX_THEME_LENGTH}
            </span>
          </div>
          {errors.theme ? (
            <p id={themeErrorId} role="alert" className="text-xs text-destructive">
              {errors.theme}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <SaveStatusBar state={saveState} message={saveMessage} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" disabled={!canEdit || submitting || !isDirty}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Zapisz zmiany
            </Button>
            <Button type="button" variant="secondary" disabled={submitting} onClick={resetToBaseline}>
              Resetuj zmiany
            </Button>
          </div>
          <Button type="button" variant="ghost" disabled={submitting} onClick={navigateBack}>
            Anuluj
          </Button>
        </div>
      </div>
    </form>
  );
}
