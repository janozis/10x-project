import type {
  ActivityStatus,
  ActivityWithEditorsDTO,
  ApiListResponse,
  ApiResponse,
  UUID,
  ActivityEditorDTO,
  AIEvaluationDTO,
} from "@/types";
import type { ActivityUpdateInput } from "@/lib/validation/activity";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch (e) {
    // Network error or fetch failed
    throw Object.assign(new Error("Network error"), { status: undefined, body: undefined, originalError: e });
  }

  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  let body: unknown;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[fetchJson] Response headers:", {
      contentType: res.headers.get("Content-Type"),
      isJson,
      status: res.status,
      ok: res.ok,
      url: res.url || (input as string),
    });
  }

  try {
    if (isJson) {
      // Try to parse JSON - read as text first to handle empty responses
      const text = await res.text();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[fetchJson] Raw response text:", {
          textLength: text.length,
          textPreview: text.substring(0, 300),
          isEmpty: !text.trim(),
        });
      }
      body = text.trim() ? JSON.parse(text) : undefined;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[fetchJson] Parsed body:", {
          bodyType: typeof body,
          bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
          hasData: !!(body as any)?.data,
          dataLength: Array.isArray((body as any)?.data) ? (body as any).data.length : undefined,
        });
      }
    } else {
      body = undefined;
    }
  } catch (e) {
    // Failed to parse JSON
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("[fetchJson] JSON parse error:", e);
    }
    throw Object.assign(new Error("Invalid JSON response"), { status: res.status, body: undefined, originalError: e });
  }

  if (!res.ok) {
    throw Object.assign(new Error("Request failed"), { status: res.status, body });
  }

  // For successful responses (200-299), empty body is valid for list endpoints
  // Return empty list response if body is undefined/null and status is 200
  if (res.status === 200 && (body === undefined || body === null)) {
    // Return default empty list response structure
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[fetchJson] Empty response body for 200 status, returning empty list");
    }
    return { data: [] } as T;
  }

  if (import.meta.env.DEV && res.status === 200) {
    // eslint-disable-next-line no-console
    console.log("[fetchJson] Success response:", {
      status: res.status,
      bodyType: typeof body,
      hasData: !!(body as any)?.data,
      dataLength: Array.isArray((body as any)?.data) ? (body as any).data.length : undefined,
      bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
      bodyPreview: body && typeof body === "object" ? JSON.stringify(body).substring(0, 200) : body,
    });
  }

  return body as T;
}

export function listActivities(
  groupId: UUID,
  options?: {
    status?: ActivityStatus;
    assigned?: "me";
    search?: string;
    deleted?: "only";
    limit?: number;
    cursor?: string;
  }
): Promise<ApiListResponse<ActivityWithEditorsDTO>> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.assigned) params.set("assigned", options.assigned);
  if (options?.search) params.set("search", options.search);
  if (options?.deleted) params.set("deleted", options.deleted);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const qs = params.toString();
  const url = qs ? `/api/groups/${groupId}/activities?${qs}` : `/api/groups/${groupId}/activities`;
  return fetchJson<ApiListResponse<ActivityWithEditorsDTO>>(url, { method: "GET" });
}

export function getActivity(activityId: UUID): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  return fetchJson<ApiResponse<ActivityWithEditorsDTO>>(`/api/activities/${activityId}`, { method: "GET" });
}

export function patchActivity(
  activityId: UUID,
  payload: ActivityUpdateInput
): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  return fetchJson<ApiResponse<ActivityWithEditorsDTO>>(`/api/activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteActivity(activityId: UUID): Promise<ApiResponse<{ id: UUID; deleted_at: string }>> {
  return fetchJson<ApiResponse<{ id: UUID; deleted_at: string }>>(`/api/activities/${activityId}`, {
    method: "DELETE",
  });
}

export function restoreActivity(activityId: UUID): Promise<ApiResponse<ActivityWithEditorsDTO>> {
  return fetchJson<ApiResponse<ActivityWithEditorsDTO>>(`/api/activities/${activityId}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listActivityEditors(activityId: UUID): Promise<ApiListResponse<ActivityEditorDTO>> {
  return fetchJson<ApiListResponse<ActivityEditorDTO>>(`/api/activities/${activityId}/editors`, { method: "GET" });
}

export function listActivityAIEvaluations(activityId: UUID): Promise<ApiListResponse<AIEvaluationDTO>> {
  return fetchJson<ApiListResponse<AIEvaluationDTO>>(`/api/activities/${activityId}/ai-evaluations`, { method: "GET" });
}

export function requestActivityAIEvaluation(
  activityId: UUID
): Promise<ApiResponse<{ queued: true; next_poll_after_sec: number }>> {
  return fetchJson<ApiResponse<{ queued: true; next_poll_after_sec: number }>>(
    `/api/activities/${activityId}/ai-evaluations`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}
