import * as React from "react";
import type { ActivityWithEditorsDTO, ApiResponse, UUID, ActivityCreateCommand, ApiError } from "@/types";
import { activityCreateSchema, type ActivityCreateInput, zodErrorToDetails } from "@/lib/validation/activity";
import type { ActivityCreateVM, FieldErrors } from "../types";

function toCommand(values: ActivityCreateInput): ActivityCreateCommand {
  return { ...values };
}

export interface CreateResult {
  ok: boolean;
  activity?: ActivityWithEditorsDTO;
  fieldErrors?: FieldErrors;
  errorCode?: string;
  errorMessage?: string;
}

export function useCreateActivity(groupId: UUID) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const create = React.useCallback(
    async (values: ActivityCreateVM): Promise<CreateResult> => {
      const pre: ActivityCreateInput = {
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

      const parsed = activityCreateSchema.safeParse(pre);
      if (!parsed.success) {
        return { ok: false, fieldErrors: zodErrorToDetails(parsed.error) };
      }

      setIsSubmitting(true);
      try {
        const cmd: ActivityCreateCommand = toCommand(parsed.data);
        const res = await fetch(`/api/groups/${groupId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cmd),
        });
        const json = (await res.json()) as ApiResponse<ActivityWithEditorsDTO>;
        if (!res.ok || "error" in json) {
          const err = json as ApiError;
          const details = (err.error.details || {}) as Record<string, string>;
          return { ok: false, fieldErrors: details, errorCode: err.error.code, errorMessage: err.error.message };
        }
        return { ok: true, activity: (json as { data: ActivityWithEditorsDTO }).data };
      } catch (e: unknown) {
        return { ok: false, errorMessage: e?.message || "Request failed" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [groupId]
  );

  return { isSubmitting, create } as const;
}
