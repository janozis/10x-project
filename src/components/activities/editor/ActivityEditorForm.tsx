import * as React from "react";
import type { UUID, GroupPermissionsDTO, UUID as UuidType } from "@/types";
import type { ActivityFormValues, ActivityEditorViewModel } from "@/lib/editor/useActivity";
import type { ActivityEditorDTO } from "@/types";
import { ActivityHeader } from "./ActivityHeader";
import { ActivityTabs } from "./ActivityTabs";
import { ActivityForm } from "./ActivityForm";
import { EditorsManager } from "./EditorsManager";
import { AIEvaluationPanel } from "./AIEvaluationPanel";
import { RelatedTasks } from "./RelatedTasks";
import { AutosaveIndicator } from "./AutosaveIndicator";
import { DirtyPrompt } from "./DirtyPrompt";
import { ConflictDiffModal } from "./ConflictDiffModal";
import { useAutosaveDrafts } from "@/lib/editor/useAutosaveDrafts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activityCreateSchema } from "@/lib/validation/activity";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { patchActivity, requestActivityAIEvaluation, getActivity } from "@/lib/activities/api.client";
import { toast } from "sonner";
import { useConflictDetection } from "@/lib/editor/useConflictDetection";
import { useCooldown } from "@/lib/activities/useCooldown";

interface ActivityEditorFormProps {
  activityId: UUID;
  initialValues: ActivityFormValues;
  vm: ActivityEditorViewModel;
  permissions: GroupPermissionsDTO | null;
  userId: UuidType | undefined;
  editors: ActivityEditorDTO[];
  onValuesChange: (values: ActivityFormValues) => void;
  onRefresh: () => Promise<void>;
}

export function ActivityEditorForm({
  activityId,
  initialValues,
  vm,
  permissions,
  userId,
  editors,
  onValuesChange,
  onRefresh,
}: ActivityEditorFormProps): JSX.Element {
  const [saving, setSaving] = React.useState(false);
  const [requestingAI, setRequestingAI] = React.useState(false);
  const {
    conflict,
    open: conflictOpen,
    setOpen: setConflictOpen,
    reportConflict,
    reset: resetConflict,
  } = useConflictDetection<ActivityFormValues>();
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | undefined>(undefined);
  const { saveDraft, drafts, error: autosaveError } = useAutosaveDrafts(activityId);
  const [aiRequestTrigger, setAiRequestTrigger] = React.useState<number | undefined>(undefined);
  const [nextPollAfterSec, setNextPollAfterSec] = React.useState<number | undefined>(undefined);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityCreateSchema),
    mode: "onBlur",
    defaultValues: initialValues,
  });
  const { handleSubmit, formState, watch, reset } = form;
  const isDirty = formState.isDirty;

  React.useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[ActivityEditorForm] Initialized with:", {
        initialValues,
        currentValues: watch(),
        permissions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watched = watch();
  const debouncedValues = useDebouncedValue(watched, 2000);
  React.useEffect(() => {
    if (!formState.isDirty) return;
    saveDraft(debouncedValues);
    setLastSavedAt(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValues]);

  const doSave = React.useCallback(
    async (values: ActivityFormValues) => {
      setSaving(true);
      try {
        await patchActivity(activityId, values);
        toast.success("Zapisano zmiany");
        onValuesChange(values);
        await onRefresh();
      } catch (e: any) {
        const code = e?.body?.error?.code as string | undefined;
        if (code === "VALIDATION_ERROR") {
          const details = e?.body?.error?.details as Record<string, string> | undefined;
          if (details) {
            Object.entries(details).forEach(([k, msg]) => {
              try {
                form.setError(k as keyof ActivityFormValues, { type: "server", message: String(msg) });
              } catch {
                // Ignore errors for invalid field names
              }
            });
            toast.error("Popraw błędy formularza");
            return;
          }
        }
        if (code === "CONFLICT") {
          try {
            const latestRes = await getActivity(activityId);
            if ("error" in latestRes) throw new Error(latestRes.error.message);
            const serverForm = dtoToForm(latestRes.data);
            const fields = diffFields(values, serverForm);
            reportConflict({
              server: { ...serverForm, updated_at: latestRes.data.updated_at },
              local: values,
              fieldsInConflict: fields,
            });
            setConflictOpen(true);
            toast.error("Wykryto konflikt zapisu");
          } catch {
            toast.error("Konflikt zapisu. Nie udało się pobrać najnowszej wersji.");
          }
        } else {
          toast.error(e?.body?.error?.message || e?.message || "Nie udało się zapisać");
        }
      } finally {
        setSaving(false);
      }
    },
    [activityId, onRefresh, onValuesChange, reportConflict, setConflictOpen, form]
  );

  const handleSave = React.useCallback(() => {
    return handleSubmit(
      (vals) => {
        void doSave(vals);
      },
      (errors) => {
        const first = Object.keys(errors || {})[0] as keyof ActivityFormValues | undefined;
        if (first) form.setFocus(first);
        toast.error("Popraw błędy formularza");
      }
    )();
  }, [handleSubmit, doSave, form]);

  async function handleRequestAI() {
    if (formState.isDirty) {
      toast.error("Zapisz zmiany przed żądaniem oceny AI");
      return;
    }
    setRequestingAI(true);
    try {
      const res = await requestActivityAIEvaluation(activityId);
      if ("error" in res) toast.error(res.error.message || "Nie udało się wysłać żądania");
      else {
        toast.success("Żądanie oceny AI zostało wysłane");
        setNextPollAfterSec(res.data.next_poll_after_sec);
        setAiRequestTrigger(Date.now());
      }
    } catch (e: any) {
      toast.error(e?.body?.error?.message || e?.message || "Nie udało się wysłać żądania");
    } finally {
      setRequestingAI(false);
    }
  }

  const isAssigned = React.useMemo(() => {
    if (!userId) return false;
    return editors?.some((e) => e.user_id === userId) ?? false;
  }, [editors, userId]);

  const canEdit = React.useMemo(() => {
    if (!permissions) return false;
    if (permissions.role === "admin") return true;
    if (permissions.can_edit_all) return true;
    if (permissions.can_edit_assigned_only && isAssigned) return true;
    return false;
  }, [permissions, isAssigned]);

  React.useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[ActivityEditorForm] Permissions check:", {
        permissions,
        userId,
        isAssigned,
        canEdit,
        editors,
      });
    }
  }, [permissions, userId, isAssigned, canEdit, editors]);

  const cooldownSec = useCooldown(vm?.last_evaluation_requested_at || undefined, 300);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  return (
    <div className="space-y-4" aria-busy={saving || requestingAI}>
      <ActivityHeader
        title="Edytor aktywności"
        status={(vm?.status as any) || "draft"}
        isDirty={isDirty}
        canEdit={canEdit}
        saving={saving}
        requestingAI={requestingAI}
        cooldownSec={cooldownSec}
        onSave={() => {
          void handleSave();
        }}
        onRequestAI={() => {
          void handleRequestAI();
        }}
      />

      <ActivityTabs
        defaultTab="form"
        form={
          <ActivityForm
            form={form}
            readOnly={!canEdit}
            onSubmit={(v) => {
              void doSave(v);
            }}
          />
        }
        editors={
          <EditorsManager activityId={activityId} groupId={vm.group_id} canManage={permissions?.role === "admin"} />
        }
        ai={
          <AIEvaluationPanel
            activityId={activityId}
            canRequest={canEdit && !isDirty && cooldownSec === 0}
            onRequest={() => {
              void handleRequestAI();
            }}
            requestTrigger={aiRequestTrigger}
            nextPollAfterSec={nextPollAfterSec}
          />
        }
        tasks={<RelatedTasks activityId={activityId} groupId={vm.group_id} />}
      />

      <div className="flex items-center justify-between">
        <AutosaveIndicator draftsCount={drafts.length} lastSavedAt={lastSavedAt} error={autosaveError} />
        <span className="text-xs text-muted-foreground">ID: {activityId}</span>
      </div>

      <DirtyPrompt active={isDirty} />
      <ConflictDiffModal
        open={conflictOpen}
        conflict={conflict}
        onOpenChange={setConflictOpen}
        onResolve={(resolution, selectedServerKeys) => {
          if (!conflict) {
            setConflictOpen(false);
            return;
          }
          if (resolution === "takeServer") {
            reset(conflict.server as ActivityFormValues, { keepDirty: false, keepDirtyValues: false });
            setConflictOpen(false);
            resetConflict();
            void doSave(conflict.server as ActivityFormValues);
          } else if (resolution === "overwriteServer") {
            setConflictOpen(false);
            const local = conflict.local as ActivityFormValues;
            resetConflict();
            void doSave(local);
          } else {
            // manualMerge: take selected keys from server, others from local
            const local = conflict.local as ActivityFormValues;
            const server = conflict.server as ActivityFormValues;
            const merged = { ...local } as ActivityFormValues;
            (selectedServerKeys || []).forEach((k) => {
              (merged as any)[k] = (server as any)[k];
            });
            reset(merged, { keepDirty: false, keepDirtyValues: false });
            setConflictOpen(false);
            resetConflict();
            void doSave(merged);
          }
        }}
      />
      <div aria-live="polite" className="sr-only">
        {saving ? "Zapisywanie…" : requestingAI ? "Wysyłanie żądania AI…" : ""}
      </div>
    </div>
  );
}

function dtoToForm(dto: any): ActivityFormValues {
  return {
    title: dto.title || "",
    objective: dto.objective || "",
    tasks: dto.tasks || "",
    duration_minutes: dto.duration_minutes || 5,
    location: dto.location || "",
    materials: dto.materials || "",
    responsible: dto.responsible || "",
    knowledge_scope: dto.knowledge_scope || "",
    participants: dto.participants || "",
    flow: dto.flow || "",
    summary: dto.summary || "",
  };
}

function diffFields(local: Record<string, unknown>, server: Record<string, unknown>): string[] {
  const keys = Array.from(new Set([...Object.keys(local), ...Object.keys(server)]));
  return keys.filter((k) => JSON.stringify(local[k]) !== JSON.stringify(server[k]));
}
