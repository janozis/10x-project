import type { UUID } from "@/types";

export type StepId = "basics" | "content" | "logistics" | "summary";

export interface ActivityCreateVM {
  title: string;
  objective: string;
  tasks: string;
  duration_minutes: number | "";
  location: string;
  materials: string;
  responsible: string;
  knowledge_scope: string;
  participants: string;
  flow: string;
  summary: string;
}

export type FieldErrors = Record<string, string | undefined>;

export interface AutosaveState {
  enabled: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt?: string;
  error?: string;
}

export interface NewActivityState {
  step: StepId;
  values: ActivityCreateVM;
  errors: FieldErrors;
  createdActivityId?: UUID;
  autosave: AutosaveState;
}
