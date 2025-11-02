import * as React from "react";
import type { GroupPermissionsDTO, GroupTaskDTO, TaskStatus, UUID } from "@/types";
import type { GroupTaskCreateInput, GroupTaskUpdateInput } from "@/lib/validation/groupTask";
import { listGroupTasks as apiList, createGroupTask as apiCreate, patchTask as apiPatch, deleteTask as apiDelete } from "./api.client";
import { useRealtimeTasks, type TaskRow } from "./useRealtimeTasks";

export interface TaskVM {
  id: UUID;
  title: string;
  description: string;
  status: TaskStatus;
  activityId?: UUID | null;
  dueDate?: string | null; // DateISO
  createdAt: string; // TimestampISO
  updatedAt: string; // TimestampISO
  isOverdue: boolean;
  daysLeft?: number;
  statusLabel: string;
  activityTitle?: string;
  canEdit: boolean;
}

export interface TaskColumnVM {
  status: TaskStatus;
  tasks: TaskVM[];
}

export interface TaskFiltersVM {
  status?: TaskStatus;
  activityId?: UUID;
}

export interface UseGroupTasksState {
  filters: TaskFiltersVM;
  columns: TaskColumnVM[];
  loading: boolean;
  error: string | null;
  nextCursor?: string;
  canEdit: boolean;
  setFilters: (patch: Partial<TaskFiltersVM>) => void;
  createTask: (input: QuickAddInput) => Promise<void>;
  updateTask: (id: UUID, patch: GroupTaskUpdateInput) => Promise<void>;
  deleteTask: (id: UUID) => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface QuickAddInput {
  title: string;
  description: string;
  dueDate?: string | null;
  activityId?: UUID | null;
}

function toVM(dto: GroupTaskDTO, canEditDefault: boolean): TaskVM {
  const isTerminal = dto.status === "done" || dto.status === "canceled";
  const dueDate = dto.due_date ?? null;
  const today = new Date();
  let isOverdue = false;
  let daysLeft: number | undefined = undefined;
  if (dueDate) {
    const due = new Date(dueDate as string);
    const diffMs = due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    isOverdue = !isTerminal && daysLeft < 0;
  }
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    status: dto.status as TaskStatus,
    activityId: dto.activity_id ?? null,
    dueDate,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    isOverdue,
    daysLeft,
    statusLabel: labelForStatus(dto.status as TaskStatus),
    activityTitle: undefined,
    canEdit: canEditDefault,
  };
}

function labelForStatus(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Oczekujące";
    case "in_progress":
      return "W toku";
    case "done":
      return "Zrobione";
    case "canceled":
      return "Anulowane";
    default:
      return status;
  }
}

function groupByStatus(vms: TaskVM[]): TaskColumnVM[] {
  const statuses: TaskStatus[] = ["pending", "in_progress", "done", "canceled"];
  const map = new Map<TaskStatus, TaskVM[]>(statuses.map((s) => [s, []] as const));
  vms.forEach((vm) => {
    map.get(vm.status)?.push(vm);
  });
  return statuses.map((s) => ({ status: s, tasks: map.get(s) ?? [] }));
}

export function useGroupTasks(groupId: UUID, initialFilters?: TaskFiltersVM): UseGroupTasksState {
  const [filters, setFiltersState] = React.useState<TaskFiltersVM>(initialFilters ?? {});
  const [tasks, setTasks] = React.useState<TaskVM[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>(undefined);
  const loadedRef = React.useRef(false);
  const [canEdit, setCanEdit] = React.useState<boolean>(false);

  const columns = React.useMemo(() => groupByStatus(tasks), [tasks]);

  function setFilters(patch: Partial<TaskFiltersVM>) {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }

  async function load(reset: boolean): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const result = await apiList(groupId, {
        status: filters.status,
        activityId: filters.activityId,
        cursor: reset ? undefined : nextCursor,
        limit: 20,
      });
      
      // Check if response is undefined or is an error
      if (!result) {
        setError("Nie udało się załadować zadań.");
        return;
      }
      
      if ("error" in result) {
        setError(result.error.message || "Nie udało się załadować zadań.");
        return;
      }
      
      const vms = (result.data ?? []).map((dto) => toVM(dto, canEdit));
      setTasks((prev) => (reset ? vms : [...prev, ...vms]));
      setNextCursor(result.nextCursor);
    } catch (e: unknown) {
      const anyErr = e as { body?: any; message?: string };
      const msg = anyErr?.body?.error?.message || anyErr?.message || "Nie udało się załadować zadań.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function resetAndLoad(): Promise<void> {
    setNextCursor(undefined);
    await load(true);
  }

  async function loadMore(): Promise<void> {
    if (!nextCursor || loading) return;
    await load(false);
  }

  async function createTask(input: QuickAddInput): Promise<void> {
    setError(null);
    try {
      const payload: GroupTaskCreateInput = {
        title: input.title,
        description: input.description,
        due_date: input.dueDate ?? null,
        activity_id: input.activityId ?? null,
      };
      const res = await apiCreate(groupId, payload);
      if ((res as any).error) throw new Error((res as any).error?.message || "Nie udało się utworzyć zadania.");
      const dto = (res as any).data as GroupTaskDTO;
      const vm = toVM(dto, canEdit);
      setTasks((prev) => [vm, ...prev]);
    } catch (e: unknown) {
      const anyErr = e as { body?: any; message?: string };
      const msg = anyErr?.body?.error?.message || anyErr?.message || "Nie udało się utworzyć zadania.";
      setError(msg);
      throw e;
    }
  }

  async function updateTask(id: UUID, patch: GroupTaskUpdateInput): Promise<void> {
    setError(null);
    try {
      const res = await apiPatch(id, patch);
      if ((res as any).error) throw new Error((res as any).error?.message || "Nie udało się zaktualizować zadania.");
      const dto = (res as any).data as GroupTaskDTO;
      const vm = toVM(dto, canEdit);
      setTasks((prev) => prev.map((t) => (t.id === id ? vm : t)));
    } catch (e: unknown) {
      const anyErr = e as { body?: any; message?: string };
      const msg = anyErr?.body?.error?.message || anyErr?.message || "Nie udało się zaktualizować zadania.";
      setError(msg);
      throw e;
    }
  }

  async function deleteTask(id: UUID): Promise<void> {
    setError(null);
    try {
      const res = await apiDelete(id);
      if ((res as any).error) throw new Error((res as any).error?.message || "Nie udało się usunąć zadania.");
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      const anyErr = e as { body?: any; message?: string };
      const msg = anyErr?.body?.error?.message || anyErr?.message || "Nie udało się usunąć zadania.";
      setError(msg);
      throw e;
    }
  }

  // Permissions fetch
  React.useEffect(() => {
    let isMounted = true;
    async function fetchPermissions() {
      try {
        const res = await fetch(`/api/groups/${groupId}/permissions`);
        if (!res.ok) return; // read-only fallback
        const body = (await res.json()) as { data: GroupPermissionsDTO };
        const role = body?.data?.role;
        const editable = role === "admin" || role === "editor";
        if (isMounted) setCanEdit(editable);
      } catch {
        // ignore
      }
    }
    fetchPermissions();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // Realtime subscription
  const handleRealtime = React.useCallback(
    (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: TaskRow | null; old: TaskRow | null }) => {
      if (payload.eventType === "INSERT" && payload.new) {
        const dto: GroupTaskDTO = {
          id: payload.new.id,
          group_id: payload.new.group_id,
          activity_id: payload.new.activity_id,
          title: payload.new.title,
          description: payload.new.description,
          due_date: payload.new.due_date,
          status: payload.new.status as TaskStatus,
          created_at: payload.new.created_at,
          updated_at: payload.new.updated_at,
        } as GroupTaskDTO;
        // Respect filters
        if (filters.status && dto.status !== filters.status) return;
        if (filters.activityId && dto.activity_id !== filters.activityId) return;
        const vm = toVM(dto, canEdit);
        setTasks((prev) => {
          const exists = prev.some((t) => t.id === vm.id);
          if (exists) return prev;
          return [vm, ...prev];
        });
      }
      if (payload.eventType === "UPDATE" && payload.new) {
        const dto: GroupTaskDTO = {
          id: payload.new.id,
          group_id: payload.new.group_id,
          activity_id: payload.new.activity_id,
          title: payload.new.title,
          description: payload.new.description,
          due_date: payload.new.due_date,
          status: payload.new.status as TaskStatus,
          created_at: payload.new.created_at,
          updated_at: payload.new.updated_at,
        } as GroupTaskDTO;
        setTasks((prev) => prev.map((t) => (t.id === dto.id ? toVM(dto, canEdit) : t)).filter((t) => {
          // Drop if no longer matches filters
          if (filters.status && t.status !== filters.status) return false;
          if (filters.activityId && t.activityId !== filters.activityId) return false;
          return true;
        }));
      }
      if (payload.eventType === "DELETE" && payload.old) {
        const id = payload.old.id;
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [filters.status, filters.activityId, canEdit]
  );

  useRealtimeTasks(groupId, handleRealtime);

  // Initial and reactive load on filters change
  React.useEffect(() => {
    // skip first effect if already loaded once and no filters changed? We'll always reset on filter change
    if (loadedRef.current) {
      resetAndLoad();
      return;
    }
    loadedRef.current = true;
    resetAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, filters.status, filters.activityId]);

  return {
    filters,
    columns,
    loading,
    error,
    nextCursor,
    canEdit,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    loadMore,
  };
}


