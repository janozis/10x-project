import type { ApiError, ApiSingle, GroupDTO, UUID } from "@/types";
import type { ResourceFailure, ResourceResult, ResourceSuccess } from "@/lib/camp-days/getCampDay";

function fallbackError(status: number, message: string): ApiError["error"] {
  return {
    code: status === 404 ? "NOT_FOUND" : status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
    message,
  };
}

function parseSingle<T>(body: unknown): ApiSingle<T> | null {
  if (!body || typeof body !== "object" || !("data" in body)) return null;
  return body as ApiSingle<T>;
}

export async function getGroupResource(
  groupId: UUID,
  init?: RequestInit,
  baseUrl?: URL | string
): Promise<ResourceResult<GroupDTO>> {
  const url = baseUrl ? new URL(`/api/groups/${groupId}`, baseUrl) : `/api/groups/${groupId}`;
  
  // Merge init with default headers
  const fetchInit: RequestInit = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin", // Important for SSR to pass cookies
    ...init,
  };
  
  const response = await fetch(url, fetchInit);

  const status = response.status;
  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const apiError = (body as ApiError | undefined)?.error;
    return {
      ok: false,
      status,
      error: apiError ?? fallbackError(status, "Nie udało się pobrać danych grupy."),
    } satisfies ResourceFailure;
  }

  const parsed = parseSingle<GroupDTO>(body);
  if (!parsed) {
    return {
      ok: false,
      status: 500,
      error: fallbackError(500, "Serwer zwrócił nieprawidłową odpowiedź."),
    } satisfies ResourceFailure;
  }

  return {
    ok: true,
    status,
    data: parsed.data,
  } satisfies ResourceSuccess<GroupDTO>;
}


