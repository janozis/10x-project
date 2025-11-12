import type { GroupDTO, ApiListResponse, ApiResponse, UUID, GroupPermissionsDTO, GroupUpdateCommand } from "@/types";
import { parseRetryAfter } from "@/lib/utils";
import type { GroupFormValues } from "./types";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterMs = parseRetryAfter(retryAfterHeader);
    throw Object.assign(new Error("Request failed"), { status: res.status, body, retryAfterMs });
  }
  return body as T;
}

export function listGroups(options?: {
  showDeleted?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<ApiListResponse<GroupDTO>> {
  const params = new URLSearchParams();
  if (options?.showDeleted) params.set("deleted", "1");
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const qs = params.toString();
  const url = qs ? `/api/groups?${qs}` : "/api/groups";
  return fetchJson<ApiListResponse<GroupDTO>>(url, { method: "GET" });
}

export function createGroup(values: GroupFormValues): Promise<ApiResponse<GroupDTO>> {
  return fetchJson<ApiResponse<GroupDTO>>("/api/groups", { method: "POST", body: JSON.stringify(values) });
}

export function deleteGroup(groupId: UUID): Promise<ApiResponse<unknown>> {
  // Endpoint may not exist yet on backend; kept for forward compatibility
  return fetchJson<ApiResponse<unknown>>(`/api/groups/${groupId}`, { method: "DELETE" });
}

export function restoreGroup(groupId: UUID): Promise<ApiResponse<GroupDTO>> {
  // Endpoint may not exist yet on backend; kept for forward compatibility
  return fetchJson<ApiResponse<GroupDTO>>(`/api/groups/${groupId}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function joinGroup(code: string): Promise<ApiResponse<unknown>> {
  // Endpoint may not exist yet on backend; kept for forward compatibility
  return fetchJson<ApiResponse<unknown>>(`/api/groups/join`, { method: "POST", body: JSON.stringify({ code }) });
}

export function getGroupPermissions(groupId: UUID): Promise<ApiResponse<GroupPermissionsDTO>> {
  return fetchJson<ApiResponse<GroupPermissionsDTO>>(`/api/groups/${groupId}/permissions`, { method: "GET" });
}

export function getGroup(groupId: UUID): Promise<ApiResponse<GroupDTO>> {
  return fetchJson<ApiResponse<GroupDTO>>(`/api/groups/${groupId}`, { method: "GET" });
}

export function patchGroup(groupId: UUID, payload: GroupUpdateCommand): Promise<ApiResponse<GroupDTO>> {
  return fetchJson<ApiResponse<GroupDTO>>(`/api/groups/${groupId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function rotateInvite(groupId: UUID): Promise<ApiResponse<GroupDTO>> {
  return fetchJson<ApiResponse<GroupDTO>>(`/api/groups/${groupId}/invite`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
