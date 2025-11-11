import * as React from "react";
import type { UUID } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import StepIndicator from "./StepIndicator";
import BasicsStep from "./BasicsStep";
import ContentStep from "./ContentStep";
import LogisticsStep from "./LogisticsStep";
import SummaryStep from "./SummaryStep";
import CtaBar from "./CtaBar";
import AddToScheduleDialog from "./AddToScheduleDialog";
import LeaveConfirmDialog from "./LeaveConfirmDialog";
import type { ActivityCreateVM, FieldErrors, NewActivityState, StepId } from "./types";
import { useLeaveGuard } from "./hooks/useLeaveGuard";
import { useStepValidation } from "./hooks/useStepValidation";
import { useCreateActivity } from "./hooks/useCreateActivity";
import { useAssignSelfOnCreate } from "./hooks/useAssignSelfOnCreate";
import { useAutosave } from "./hooks/useAutosave";

export interface NewActivityStepperProps {
  groupId: UUID;
}

const INITIAL_VALUES: ActivityCreateVM = {
  title: "",
  objective: "",
  tasks: "",
  duration_minutes: "",
  location: "",
  materials: "",
  responsible: "",
  knowledge_scope: "",
  participants: "",
  flow: "",
  summary: "",
};

const STEP_ORDER: StepId[] = ["basics", "content", "logistics", "summary"];

export default function NewActivityStepper({ groupId }: NewActivityStepperProps) {
  const [state, setState] = React.useState<NewActivityState>({
    step: "basics",
    values: INITIAL_VALUES,
    errors: {},
    autosave: { enabled: false, isDirty: false, isSaving: false },
  });
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const { validateBasics, validateContent, validateLogistics, validateAll } = useStepValidation(state.values);
  const { isSubmitting, create } = useCreateActivity(groupId);
  const { assign } = useAssignSelfOnCreate();
  const [permissionsWarning, setPermissionsWarning] = React.useState<string | undefined>(undefined);

  const autosave = useAutosave(state.createdActivityId, state.values, {
    enabled: state.autosave.enabled,
    debounceMs: 1000,
    onForbidden: (msg) => {
      setPermissionsWarning(msg || "Brak uprawnień do edycji.");
      setState((s) => ({ ...s, autosave: { ...s.autosave, enabled: false } }));
    },
  });

  const stepIndex = React.useMemo(() => STEP_ORDER.indexOf(state.step), [state.step]);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  const completedSteps = React.useMemo<StepId[]>(() => {
    const done: StepId[] = [];
    if (Object.keys(validateBasics()).length === 0) done.push("basics");
    if (Object.keys(validateContent()).length === 0) done.push("content");
    if (Object.keys(validateLogistics()).length === 0) done.push("logistics");
    return done;
  }, [validateBasics, validateContent, validateLogistics]);

  const canGoNext = React.useMemo(
    () => completedSteps.includes(state.step) || state.step === "summary",
    [completedSteps, state.step]
  );

  const onStepClick = React.useCallback(
    (id: StepId) => {
      // Allow moving back freely; forward only if previous steps completed
      const targetIdx = STEP_ORDER.indexOf(id);
      if (targetIdx <= stepIndex) {
        setState((s) => ({ ...s, step: id }));
        return;
      }
      const allPrevCompleted = STEP_ORDER.slice(0, targetIdx).every((sid) => completedSteps.includes(sid));
      if (allPrevCompleted) setState((s) => ({ ...s, step: id }));
    },
    [stepIndex, completedSteps]
  );

  const handleFieldChange = React.useCallback((field: keyof ActivityCreateVM, value: string | number) => {
    setState((s) => {
      const nextErrors: FieldErrors = { ...s.errors };
      delete nextErrors[field as string];
      return {
        ...s,
        values: { ...s.values, [field]: value },
        errors: nextErrors,
        autosave: { ...s.autosave, isDirty: true },
      };
    });
  }, []);

  const goBack = React.useCallback(() => {
    if (stepIndex > 0) setState((s) => ({ ...s, step: STEP_ORDER[stepIndex - 1] }));
  }, [stepIndex]);

  const goNextOrSubmit = React.useCallback(async () => {
    if (!isLastStep) {
      // Validate current step and update errors before moving forward
      let stepErrors: FieldErrors = {};
      if (state.step === "basics") stepErrors = validateBasics();
      else if (state.step === "content") stepErrors = validateContent();
      else if (state.step === "logistics") stepErrors = validateLogistics();

      if (Object.keys(stepErrors).length > 0) {
        setState((s) => ({ ...s, errors: { ...s.errors, ...stepErrors } }));
        return;
      }
      setState((s) => ({ ...s, step: STEP_ORDER[stepIndex + 1] }));
      return;
    }

    // Final submit: validate all, then POST create; on success, try self-assign and enable autosave
    const result = validateAll();
    if (!result.ok) {
      setState((s) => ({ ...s, errors: { ...result.errors } }));
      toast.error("Proszę poprawić błędy w formularzu.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await create(state.values);
      if (!res.ok || !res.activity) {
        if (res.fieldErrors && Object.keys(res.fieldErrors).length) {
          setState((s) => ({ ...s, errors: { ...res.fieldErrors } }));
        }
        toast.error(res.errorMessage || "Nie udało się utworzyć aktywności.");
        return;
      }

      const activityId = res.activity.id as any;
      setState((s) => ({
        ...s,
        createdActivityId: activityId,
        autosave: {
          ...s.autosave,
          enabled: true,
          isDirty: false,
          lastSavedAt: new Date().toISOString(),
          error: undefined,
        },
      }));
      toast.success("Aktywność utworzona.");

      // Attempt to self-assign as editor (non-blocking)
      const assignRes = await assign(activityId);
      if (!assignRes.ok) {
        // If forbidden, warn and keep autosave disabled to reflect backend constraint
        setState((s) => ({
          ...s,
          autosave: { ...s.autosave, enabled: false, error: assignRes.errorMessage || "Brak uprawnień do przypisania" },
        }));
        setPermissionsWarning(assignRes.errorMessage || "Nie masz uprawnień do edycji tej aktywności.");
        toast.warning("Nie udało się przypisać jako edytor. Skontaktuj się z adminem.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    isLastStep,
    stepIndex,
    state.step,
    validateBasics,
    validateContent,
    validateLogistics,
    validateAll,
    create,
    assign,
    state.values,
  ]);

  // Guard against accidental navigation when there are unsaved changes before the first save
  useLeaveGuard(state.autosave.isDirty && !state.createdActivityId);

  // Focus management: focus first field in current step on step change
  React.useEffect(() => {
    const container = document.querySelector('#stepper-content [data-step="' + state.step + '"]') as HTMLElement | null;
    if (!container) return;
    const first = container.querySelector("input, textarea, select, button");
    (first as HTMLElement | null)?.focus?.();
  }, [state.step]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nowa aktywność</CardTitle>
        <CardDescription>Utwórz nową aktywność w grupie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6" id="stepper-content">
        <div className="flex flex-col gap-2">
          <StepIndicator current={state.step} completed={completedSteps} onStepClick={onStepClick} />
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            {state.autosave.enabled ? (
              autosave.isSaving ? (
                <span>Zapisywanie…</span>
              ) : autosave.lastSavedAt ? (
                <span>Ostatnio zapisano: {new Date(autosave.lastSavedAt).toLocaleTimeString()}</span>
              ) : null
            ) : (
              <span>Autosave wyłączony</span>
            )}
            {autosave.error && <span className="text-red-600">Błąd autosave: {autosave.error}</span>}
          </div>
          {permissionsWarning && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800">
              {permissionsWarning} Autosave jest wyłączony. Skontaktuj się z administratorem.
            </div>
          )}
        </div>

        {state.step === "basics" && (
          <div data-step="basics">
            <BasicsStep values={state.values} errors={state.errors} onChange={handleFieldChange} />
          </div>
        )}
        {state.step === "content" && (
          <div data-step="content">
            <ContentStep values={state.values} errors={state.errors} onChange={handleFieldChange} onBack={goBack} />
          </div>
        )}
        {state.step === "logistics" && (
          <div data-step="logistics">
            <LogisticsStep values={state.values} errors={state.errors} onChange={handleFieldChange} onBack={goBack} />
          </div>
        )}
        {state.step === "summary" && (
          <div data-step="summary">
            <SummaryStep values={state.values} errors={state.errors} onBack={goBack} isSubmitting={submitting} />
          </div>
        )}

        <CtaBar
          canGoBack={stepIndex > 0}
          canGoNext={canGoNext}
          isLastStep={isLastStep}
          isSubmitting={submitting}
          isCreated={!!state.createdActivityId}
          onBack={goBack}
          onNextOrSubmit={goNextOrSubmit}
          onAddToSchedule={() => setScheduleOpen(true)}
        />

        <AddToScheduleDialog
          open={scheduleOpen}
          groupId={groupId}
          activityId={state.createdActivityId}
          onClose={() => setScheduleOpen(false)}
          onCreated={() => {
            setScheduleOpen(false);
            toast.success("Dodano do planu dnia.");
          }}
        />

        <LeaveConfirmDialog
          open={leaveOpen}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => {
            setLeaveOpen(false);
            // Navigation away will be handled by router (outside scope of scaffolding)
          }}
        />
      </CardContent>
    </Card>
  );
}
