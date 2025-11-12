import * as React from "react";
import type { ApiError, ApiSingle, GroupPermissionsDTO, UUID } from "@/types";

export interface UseGroupPermissionsResult {
  permissions: GroupPermissionsDTO | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  lastFetchedAt: number | null;
  refetch: () => Promise<void>;
}

const permissionsCache = new Map<UUID, GroupPermissionsDTO | null>();
const permissionsFetchTimestampCache = new Map<UUID, number>();

export function useGroupPermissions(groupId: UUID | null | undefined): UseGroupPermissionsResult {
  const [permissions, setPermissions] = React.useState<GroupPermissionsDTO | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = React.useState<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const cacheKey = React.useMemo(() => groupId ?? null, [groupId]);

  React.useEffect(() => {
    if (!cacheKey) {
      setPermissions(null);
      setLastFetchedAt(null);
      return;
    }

    if (permissionsCache.has(cacheKey)) {
      setPermissions(permissionsCache.get(cacheKey) ?? null);
      setLastFetchedAt(permissionsFetchTimestampCache.get(cacheKey) ?? null);
    }
  }, [cacheKey]);

  const fetchPermissions = React.useCallback(async () => {
    if (!groupId) {
      setPermissions(null);
      setError("Brak identyfikatora grupy");
      setNotFound(true);
      setLastFetchedAt(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await fetch(`/api/groups/${groupId}/permissions`, { signal: controller.signal });

      if (!res.ok) {
        let message = "Nie udało się pobrać uprawnień.";
        let body: ApiError | null = null;
        try {
          body = (await res.json()) as ApiError;
          message = body?.error?.message ?? message;
        } catch (jsonErr) {
          if (jsonErr instanceof DOMException && jsonErr.name === "AbortError") {
            return;
          }
        }

        const mapped = mapGroupPermissionsError(res.status, body);
        if (mapped) {
          message = mapped;
        }

        if (res.status === 401) {
          redirectToLogin();
        }

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          setNotFound(true);
        }

        throw new Error(message);
      }

      const payload = (await res.json()) as ApiSingle<GroupPermissionsDTO>;
      setPermissions(payload.data);
      setNotFound(false);
      permissionsCache.set(groupId, payload.data);
      const timestamp = Date.now();
      permissionsFetchTimestampCache.set(groupId, timestamp);
      setLastFetchedAt(timestamp);
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      setError(err?.message ?? "Wystąpił nieznany błąd");
      if (err?.name === "AbortError") {
        return;
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      abortRef.current = null;
    }
  }, [groupId]);

  React.useEffect(() => {
    void fetchPermissions();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchPermissions]);

  const refetch = React.useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, error, notFound, lastFetchedAt, refetch };
}

function mapGroupPermissionsError(status: number, body: ApiError | null): string | null {
  switch (status) {
    case 401:
      return "Twoja sesja wygasła. Zaloguj się ponownie, aby sprawdzić uprawnienia.";
    case 403:
      return "Nie masz dostępu do uprawnień tej grupy.";
    case 404:
      return "Nie znaleziono uprawnień dla tej grupy.";
    case 429:
      return "Zbyt wiele żądań. Odczekaj chwilę i spróbuj ponownie.";
    case 500:
      return "Serwer napotkał błąd podczas pobierania uprawnień.";
    default:
      return body?.error?.message ?? null;
  }
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const redirectTarget = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams();
  params.set("redirect", redirectTarget);
  window.location.assign(`/login?${params.toString()}`);
}
