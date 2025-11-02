import type {
  ApiListResponse,
  ApiResponse,
  ApiSingle,
  CampDayCreateCommand,
  CampDayDTO,
  CampDayUpdateCommand,
  UUID,
  WithMeta,
} from "@/types";
import { parseRetryAfter } from "@/lib/utils";

function buildInvalidResponse(): ApiResponse<CampDayDTO> {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "Invalid response payload",
    },
  };
}

function parseApiSingle<T>(payload: unknown): ApiSingle<T> | null {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return null;
  return payload as ApiSingle<T>;
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterMs = parseRetryAfter(retryAfterHeader);
    throw Object.assign(new Error("Request failed"), { status: res.status, body, retryAfterMs });
  }
  return body as T;
}

export function createCampDay(groupId: UUID, payload: CampDayCreateCommand): Promise<ApiResponse<CampDayDTO>> {
  return fetchJson<ApiResponse<CampDayDTO>>(`/api/groups/${groupId}/camp-days`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCampDay(campDayId: UUID): Promise<ApiResponse<{ id: UUID }>> {
  return fetchJson<ApiResponse<{ id: UUID }>>(`/api/camp-days/${campDayId}`, {
    method: "DELETE",
  });
}

export function listCampDays(groupId: UUID, init?: RequestInit): Promise<ApiListResponse<CampDayDTO>> {
  return fetchJson<ApiListResponse<CampDayDTO>>(`/api/groups/${groupId}/camp-days`, {
    method: "GET",
    ...init,
  });
}

export async function getCampDayWithMeta(campDayId: UUID): Promise<WithMeta<CampDayDTO> | ApiResponse<CampDayDTO>> {
  const res = await fetch(`/api/camp-days/${campDayId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) {
    return (body ?? {}) as ApiResponse<CampDayDTO>;
  }
  const parsed = parseApiSingle<CampDayDTO>(body);
  if (!parsed) {
    return buildInvalidResponse();
  }
  const etag = res.headers.get("ETag") ?? res.headers.get("etag") ?? undefined;
  return { data: parsed.data, _meta: etag ? { etag } : undefined };
}

export async function patchCampDayWithIfMatch(
  campDayId: UUID,
  payload: CampDayUpdateCommand,
  ifMatch?: string
): Promise<WithMeta<CampDayDTO> | ApiResponse<CampDayDTO>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ifMatch) headers["If-Match"] = ifMatch;
  const res = await fetch(`/api/camp-days/${campDayId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;
  if (!res.ok) {
    return (body ?? {}) as ApiResponse<CampDayDTO>;
  }
  const parsed = parseApiSingle<CampDayDTO>(body);
  if (!parsed) {
    return buildInvalidResponse();
  }
  const etag = res.headers.get("ETag") ?? res.headers.get("etag") ?? undefined;
  return { data: parsed.data, _meta: etag ? { etag } : undefined };
}

export function patchCampDay(campDayId: UUID, payload: CampDayUpdateCommand): Promise<ApiResponse<CampDayDTO>> {
  return fetchJson<ApiResponse<CampDayDTO>>(`/api/camp-days/${campDayId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
