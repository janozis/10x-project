import type { ApiListResponse, ApiResponse, GroupMemberDTO, GroupPermissionsDTO, GroupRole, UUID } from "@/types";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) throw Object.assign(new Error("Request failed"), { status: res.status, body });
  return body as T;
}

export function listMembers(groupId: UUID): Promise<ApiListResponse<GroupMemberDTO>> {
  return fetchJson<ApiListResponse<GroupMemberDTO>>(`/api/groups/${groupId}/members`, { method: "GET" });
}

export function changeMemberRole(groupId: UUID, userId: UUID, role: GroupRole): Promise<ApiResponse<GroupMemberDTO>> {
  return fetchJson<ApiResponse<GroupMemberDTO>>(`/api/groups/${groupId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(groupId: UUID, userId: UUID): Promise<void> {
  return fetchJson<void>(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
}

export function promoteMember(groupId: UUID, userId: UUID): Promise<ApiResponse<GroupMemberDTO>> {
  return fetchJson<ApiResponse<GroupMemberDTO>>(`/api/groups/${groupId}/members/${userId}/promote`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getPermissions(groupId: UUID): Promise<ApiResponse<GroupPermissionsDTO>> {
  // Convenience passthrough to existing endpoint for callers that prefer single module import
  return fetchJson<ApiResponse<GroupPermissionsDTO>>(`/api/groups/${groupId}/permissions`, { method: "GET" });
}
