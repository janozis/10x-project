import type { ApiListResponse, ApiResponse, GroupTaskDTO, UUID, WithMeta } from "@/types";
import type { GroupTaskCreateInput, GroupTaskUpdateInput } from "@/lib/validation/groupTask";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const { headers = {}, cache, credentials, ...rest } = init ?? {};
  const res = await fetch(input, {
    cache: cache ?? "no-store",
    credentials: credentials ?? "include",
    ...rest,
    headers: { "Content-Type": "application/json", ...headers },
  });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) throw Object.assign(new Error("Request failed"), { status: res.status, body });
  return body as T;
}

export interface TasksListOptions {
  status?: "pending" | "in_progress" | "done" | "canceled";
  activityId?: UUID;
  limit?: number;
  cursor?: string;
}

export function listGroupTasks(groupId: UUID, options?: TasksListOptions): Promise<ApiListResponse<GroupTaskDTO>> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.activityId) params.set("activity_id", options.activityId);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const qs = params.toString();
  const url = qs ? `/api/groups/${groupId}/tasks?${qs}` : `/api/groups/${groupId}/tasks`;
  return fetchJson<ApiListResponse<GroupTaskDTO>>(url, { method: "GET" });
}

export function createGroupTask(groupId: UUID, payload: GroupTaskCreateInput): Promise<ApiResponse<GroupTaskDTO>> {
  return fetchJson<ApiResponse<GroupTaskDTO>>(`/api/groups/${groupId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTask(taskId: UUID): Promise<ApiResponse<GroupTaskDTO>> {
  return fetchJson<ApiResponse<GroupTaskDTO>>(`/api/tasks/${taskId}`, { method: "GET" });
}

export function patchTask(taskId: UUID, payload: GroupTaskUpdateInput): Promise<ApiResponse<GroupTaskDTO>> {
  return fetchJson<ApiResponse<GroupTaskDTO>>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTask(taskId: UUID): Promise<ApiResponse<{ id: UUID }>> {
  return fetchJson<ApiResponse<{ id: UUID }>>(`/api/tasks/${taskId}`, { method: "DELETE" });
}

// ============ Concurrency-aware variants (ETag support) ============

export async function getTaskWithMeta(taskId: UUID): Promise<WithMeta<GroupTaskDTO> | ApiResponse<GroupTaskDTO>> {
  const res = await fetch(`/api/tasks/${taskId}`, { method: "GET", headers: { "Content-Type": "application/json" } });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) return body as ApiResponse<GroupTaskDTO>;
  const etag = res.headers.get("ETag") || res.headers.get("etag") || undefined;
  return { data: (body as any).data as GroupTaskDTO, _meta: etag ? { etag } : undefined };
}

export async function patchTaskWithIfMatch(
  taskId: UUID,
  payload: GroupTaskUpdateInput,
  ifMatch?: string
): Promise<WithMeta<GroupTaskDTO> | ApiResponse<GroupTaskDTO>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ifMatch) headers["If-Match"] = ifMatch;
  const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload), headers });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) return body as ApiResponse<GroupTaskDTO>;
  const etag = res.headers.get("ETag") || res.headers.get("etag") || undefined;
  return { data: (body as any).data as GroupTaskDTO, _meta: etag ? { etag } : undefined };
}
