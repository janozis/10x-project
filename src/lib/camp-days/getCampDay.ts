import type { ApiError, ApiSingle, CampDayDTO, UUID } from "@/types";

export interface ResourceSuccess<T> {
  ok: true;
  status: number;
  data: T;
  etag?: string;
}

export interface ResourceFailure {
  ok: false;
  status: number;
  error: ApiError["error"];
}

export type ResourceResult<T> = ResourceSuccess<T> | ResourceFailure;

function fallbackError(status: number, message: string): ApiError["error"] {
  return {
    code: status === 404 ? "NOT_FOUND" : status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR",
    message,
  };
}

function parseSingle<T>(body: unknown): ApiSingle<T> | null {
  if (!body || typeof body !== "object" || !("data" in body)) {
    return null;
  }
  return body as ApiSingle<T>;
}

export async function getCampDayResource(
  campDayId: UUID,
  init?: RequestInit,
  baseUrl?: URL | string
): Promise<ResourceResult<CampDayDTO>> {
  const url = baseUrl ? new URL(`/api/camp-days/${campDayId}`, baseUrl) : `/api/camp-days/${campDayId}`;

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
      error: apiError ?? fallbackError(status, "Nie udało się pobrać dnia obozowego."),
    };
  }

  const parsed = parseSingle<CampDayDTO>(body);
  if (!parsed) {
    return {
      ok: false,
      status: 500,
      error: fallbackError(500, "Serwer zwrócił nieprawidłową odpowiedź."),
    };
  }

  const etag = response.headers.get("ETag") ?? response.headers.get("etag") ?? undefined;
  return {
    ok: true,
    status,
    data: parsed.data,
    etag,
  };
}
