import * as React from "react";
import type { ApiError, ApiList, ActivityScheduleDTO, CampDayDTO, UUID } from "@/types";
import { minutesBetween } from "@/lib/camp-days/types";

export interface UseCampDaysListResult {
  campDays: CampDayDTO[];
  metrics: Map<string, CampDayMetrics>;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  lastFetchedAt: number | null;
  refetch: () => Promise<void>;
}

export interface CampDayMetrics {
  slotsCount: number;
  totalMinutes: number;
}

interface CampDayMetricsAggregateDTO {
  camp_day_id: UUID;
  slots_count: number;
  total_minutes: number;
}

const metricsCache = new Map<UUID, Map<string, CampDayMetrics>>();
const fetchTimestampCache = new Map<UUID, number>();

export function useCampDaysList(groupId: UUID | null | undefined): UseCampDaysListResult {
  const [campDays, setCampDays] = React.useState<CampDayDTO[]>([]);
  const [metrics, setMetrics] = React.useState<Map<string, CampDayMetrics>>(new Map());
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = React.useState<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const cacheKey = React.useMemo(() => groupId ?? null, [groupId]);

  React.useEffect(() => {
    if (!cacheKey) {
      setMetrics(new Map());
      setLastFetchedAt(null);
      return;
    }

    const cachedMetrics = metricsCache.get(cacheKey);
    const cachedTimestamp = fetchTimestampCache.get(cacheKey) ?? null;

    if (cachedMetrics) {
      setMetrics(new Map(cachedMetrics));
      setLastFetchedAt(cachedTimestamp);
    }
  }, [cacheKey]);

  const updateMetricsState = React.useCallback((next: Map<string, CampDayMetrics>): void => {
    setMetrics((prev) => {
      if (shallowCompareMetrics(prev, next)) {
        return prev;
      }
      return new Map(next);
    });
  }, []);

  const computeMetrics = React.useCallback(
    async (campDayList: CampDayDTO[], signal: AbortSignal) => {
      if (!campDayList.length) {
        if (!signal.aborted) {
          updateMetricsState(new Map());
        }
        if (cacheKey && !signal.aborted) {
          metricsCache.set(cacheKey, new Map());
          const timestamp = Date.now();
          fetchTimestampCache.set(cacheKey, timestamp);
          setLastFetchedAt(timestamp);
        }
        return;
      }

      const aggregateFromApi = await fetchCampDaysMetricsAggregate(groupId, signal);
      if (aggregateFromApi) {
        if (!signal.aborted) {
          updateMetricsState(aggregateFromApi);
        }
        if (cacheKey && !signal.aborted) {
          metricsCache.set(cacheKey, new Map(aggregateFromApi));
          const timestamp = Date.now();
          fetchTimestampCache.set(cacheKey, timestamp);
          setLastFetchedAt(timestamp);
        }
        return;
      }

      const entries: [string, CampDayMetrics][] = [];

      await Promise.all(
        campDayList.map(async (day) => {
          try {
            const schedules = await fetchSchedulesForCampDay(day.id, signal);
            if (!schedules) {
              entries.push([day.id, { slotsCount: 0, totalMinutes: 0 }]);
              return;
            }

            let minutes = 0;
            for (const schedule of schedules) {
              minutes += Math.max(0, minutesBetween(schedule.start_time, schedule.end_time));
            }

            entries.push([day.id, { slotsCount: schedules.length, totalMinutes: minutes }]);
          } catch {
            entries.push([day.id, { slotsCount: 0, totalMinutes: 0 }]);
          }
        })
      );

      if (!signal.aborted) {
        updateMetricsState(new Map(entries));
        if (cacheKey) {
          const map = new Map(entries);
          metricsCache.set(cacheKey, map);
          const timestamp = Date.now();
          fetchTimestampCache.set(cacheKey, timestamp);
          setLastFetchedAt(timestamp);
        }
      }
    },
    [cacheKey, groupId, updateMetricsState]
  );

  const fetchCampDays = React.useCallback(async () => {
    if (!groupId) {
      setCampDays([]);
      setMetrics(new Map());
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
    if (!metricsCache.has(groupId)) {
      setMetrics(new Map());
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/camp-days`, { signal: controller.signal });

      if (!res.ok) {
        let message = "Nie udało się załadować dni obozu.";
        let body: ApiError | null = null;
        try {
          body = (await res.json()) as ApiError;
          message = body?.error?.message ?? message;
        } catch (jsonErr) {
          if (jsonErr instanceof DOMException && jsonErr.name === "AbortError") {
            return;
          }
        }

        const mapped = mapCampDaysError(res.status, body);
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

      const payload = (await res.json()) as ApiList<CampDayDTO>;
      setCampDays(payload.data);
      await computeMetrics(payload.data, controller.signal);
      setNotFound(false);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      setError((err as Error)?.message ?? "Wystąpił nieznany błąd");
      if ((err as Error)?.name === "AbortError") {
        return;
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      abortRef.current = null;
    }
  }, [computeMetrics, groupId]);

  React.useEffect(() => {
    void fetchCampDays();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchCampDays]);

  const refetch = React.useCallback(async () => {
    await fetchCampDays();
  }, [fetchCampDays]);

  return { campDays, metrics, loading, error, notFound, lastFetchedAt, refetch };
}

function shallowCompareMetrics(prev: Map<string, CampDayMetrics>, next: Map<string, CampDayMetrics>): boolean {
  if (prev.size !== next.size) return false;
  for (const [key, value] of next.entries()) {
    const other = prev.get(key);
    if (!other) return false;
    if (other.slotsCount !== value.slotsCount || other.totalMinutes !== value.totalMinutes) {
      return false;
    }
  }
  return true;
}

async function fetchCampDaysMetricsAggregate(
  groupId: UUID | null | undefined,
  signal: AbortSignal
): Promise<Map<string, CampDayMetrics> | null> {
  if (!groupId) return null;

  try {
    const res = await fetch(`/api/groups/${groupId}/camp-days/metrics`, { signal });
    if (!res.ok) {
      if (res.status === 401) {
        redirectToLogin();
      }
      if (res.status === 404 || res.status === 501) {
        return null;
      }
      return null;
    }

    const payload = (await res.json()) as ApiList<CampDayMetricsAggregateDTO>;
    const aggregate = new Map<string, CampDayMetrics>();
    for (const item of payload.data) {
      aggregate.set(item.camp_day_id, {
        slotsCount: item.slots_count ?? 0,
        totalMinutes: item.total_minutes ?? 0,
      });
    }
    return aggregate;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return null;
    }
    return null;
  }
}

async function fetchSchedulesForCampDay(campDayId: UUID, signal: AbortSignal): Promise<ActivityScheduleDTO[] | null> {
  try {
    const res = await fetch(`/api/camp-days/${campDayId}/schedules`, { signal });
    if (!res.ok) {
      if (res.status === 401) {
        redirectToLogin();
      }
      if (res.status === 404 || res.status === 403) {
        return null;
      }
      let message = "Nie udało się pobrać harmonogramu dnia.";
      try {
        const body = (await res.json()) as ApiError;
        message = body?.error?.message ?? message;
      } catch {
        // pomijamy — zostawiamy domyślny komunikat
      }
      throw new Error(message);
    }
    const payload = (await res.json()) as ApiList<ActivityScheduleDTO>;
    return payload.data;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return null;
    }
    throw err;
  }
}

function mapCampDaysError(status: number, body: ApiError | null): string | null {
  switch (status) {
    case 401:
      return "Twoja sesja wygasła. Zaloguj się ponownie, aby zobaczyć dni obozu.";
    case 403:
      return "Nie masz uprawnień do przeglądania dni obozu w tej grupie.";
    case 404:
      return "Nie znaleziono danych dni obozu dla tej grupy.";
    case 429:
      return "Zbyt wiele żądań. Odczekaj chwilę i spróbuj ponownie.";
    case 500:
      return "Serwer napotkał błąd. Spróbuj ponownie później.";
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
