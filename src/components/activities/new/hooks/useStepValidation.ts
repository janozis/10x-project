import * as React from "react";
import { activityCreateSchema, type ActivityCreateInput, zodErrorToDetails } from "@/lib/validation/activity";
import type { ActivityCreateVM, FieldErrors } from "../types";

function coerceToCreateInput(values: ActivityCreateVM): ActivityCreateInput {
  return {
    title: values.title.trim(),
    objective: values.objective.trim(),
    tasks: values.tasks.trim(),
    duration_minutes:
      typeof values.duration_minutes === "number"
        ? values.duration_minutes
        : parseInt(values.duration_minutes || "0", 10),
    location: values.location.trim(),
    materials: values.materials.trim(),
    responsible: values.responsible.trim(),
    knowledge_scope: values.knowledge_scope.trim(),
    participants: values.participants.trim(),
    flow: values.flow.trim(),
    summary: values.summary.trim(),
  };
}

export function useStepValidation(values: ActivityCreateVM) {
  const validateBasics = React.useCallback((): FieldErrors => {
    const subset = {
      title: values.title,
      objective: values.objective,
      duration_minutes:
        typeof values.duration_minutes === "number"
          ? values.duration_minutes
          : parseInt(values.duration_minutes || "0", 10),
      participants: values.participants,
    } as const;
    const schema = activityCreateSchema.pick({
      title: true,
      objective: true,
      duration_minutes: true,
      participants: true,
    });
    const parsed = schema.safeParse(subset);
    if (parsed.success) return {};
    return zodErrorToDetails(parsed.error);
  }, [values]);

  const validateContent = React.useCallback((): FieldErrors => {
    const subset = { tasks: values.tasks, flow: values.flow, summary: values.summary } as const;
    const schema = activityCreateSchema.pick({ tasks: true, flow: true, summary: true });
    const parsed = schema.safeParse(subset);
    if (parsed.success) return {};
    return zodErrorToDetails(parsed.error);
  }, [values]);

  const validateLogistics = React.useCallback((): FieldErrors => {
    const subset = {
      location: values.location,
      materials: values.materials,
      responsible: values.responsible,
      knowledge_scope: values.knowledge_scope,
    } as const;
    const schema = activityCreateSchema.pick({
      location: true,
      materials: true,
      responsible: true,
      knowledge_scope: true,
    });
    const parsed = schema.safeParse(subset);
    if (parsed.success) return {};
    return zodErrorToDetails(parsed.error);
  }, [values]);

  const validateAll = React.useCallback((): { ok: boolean; errors: FieldErrors; payload?: ActivityCreateInput } => {
    const payload = coerceToCreateInput(values);
    const parsed = activityCreateSchema.safeParse(payload);
    if (parsed.success) return { ok: true, errors: {}, payload: parsed.data };
    return { ok: false, errors: zodErrorToDetails(parsed.error) };
  }, [values]);

  return { validateBasics, validateContent, validateLogistics, validateAll } as const;
}
