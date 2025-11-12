import * as React from "react";
import type { ActivityEditorDTO, ActivityWithEditorsDTO, UUID } from "@/types";
import { getActivity } from "@/lib/activities/api.client";

export interface ActivityEditorViewModel {
  id: UUID;
  group_id: UUID;
  status: string;
  updated_at: string;
  last_evaluation_requested_at?: string | null;
}

export interface ActivityFormValues {
  title: string;
  objective: string;
  tasks: string;
  duration_minutes: number;
  location: string;
  materials: string;
  responsible: string;
  knowledge_scope: string;
  participants: string;
  flow: string;
  summary: string;
}

function mapToFormValues(dto: ActivityWithEditorsDTO): ActivityFormValues {
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

export function useActivity(activityId: UUID) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [vm, setVm] = React.useState<ActivityEditorViewModel | null>(null);
  const [formValues, setFormValues] = React.useState<ActivityFormValues | null>(null);
  const [editors, setEditors] = React.useState<ActivityEditorDTO[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getActivity(activityId);
      if ("error" in res) throw new Error(res.error.message);
      const dto = res.data as ActivityWithEditorsDTO;
      setVm({
        id: dto.id,
        group_id: dto.group_id,
        status: dto.status,
        updated_at: dto.updated_at,
        last_evaluation_requested_at: (dto as any).last_evaluation_requested_at ?? null,
      });
      setFormValues(mapToFormValues(dto));
      setEditors(dto.editors || []);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, vm, formValues, setFormValues, editors, refresh } as const;
}
