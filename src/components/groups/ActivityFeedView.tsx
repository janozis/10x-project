import * as React from "react";
import type { UUID, GroupDashboardDTO, GroupPermissionsDTO } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardRealtime } from "@/lib/dashboard/useDashboardRealtime";
import type {
  ActivityFeedEventType,
  ActivityFeedEventVM,
  ActivityFeedFiltersVM,
  RealtimeStatus,
} from "@/lib/dashboard/activity-feed.types";
import { ActivityFeedFilters } from "@/components/groups/ActivityFeedFilters";
import { ActivityFeedList } from "@/components/groups/ActivityFeedList";
import { LiveIndicator } from "@/components/groups/LiveIndicator";
import { LoadingSkeleton } from "@/components/groups/LoadingSkeleton";
import { ErrorState } from "@/components/groups/ErrorState";
import { ActivityFeedEmpty } from "@/components/groups/ActivityFeedEmpty";

// types moved to @/lib/dashboard/activity-feed.types

interface ActivityFeedViewProps {
  groupId: UUID;
}

export default function ActivityFeedView({ groupId }: ActivityFeedViewProps): JSX.Element {
  const [status, setStatus] = React.useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const [errorStatus, setErrorStatus] = React.useState<number | undefined>(undefined);
  const [events, setEvents] = React.useState<ActivityFeedEventVM[]>([]);
  const [realtimeStatus, setRealtimeStatus] = React.useState<RealtimeStatus>("off");
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [filters, setFilters] = React.useState<ActivityFeedFiltersVM>({
    types: ["activity_created", "activity_updated"],
  });

  // Initial fetch: permissions + dashboard
  React.useEffect(() => {
    let isMounted = true;
    if (!groupId || !isValidUUID(groupId)) {
      setStatus("error");
      setErrorMessage(!groupId ? "Brak identyfikatora grupy." : "Nieprawidłowy identyfikator grupy.");
      setErrorStatus(400);
      return;
    }

    async function fetchInitial() {
      setStatus("loading");
      setErrorMessage(undefined);
      try {
        const [permRes, dashRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/permissions`),
          fetch(`/api/groups/${groupId}/dashboard?recent_limit=10`),
        ]);

        if (!permRes.ok) {
          // Permissions error is critical for access to the feed
          const body = await safeJson(permRes);
          const code = permRes.status;
          let message = body?.error?.message as string | undefined;
          if (!message) {
            message =
              code === 401
                ? "Musisz być zalogowany, aby zobaczyć aktywność tej grupy."
                : code === 404
                  ? "Nie znaleziono grupy lub nie masz do niej dostępu."
                  : "Brak dostępu do grupy.";
          }
          if (!isMounted) return;
          setErrorStatus(code);
          setStatus("error");
          setErrorMessage(message);
          return;
        }

        await permRes.json(); // Validate permissions but don't store
        const dashBody = dashRes.ok ? ((await dashRes.json()) as { data: GroupDashboardDTO }) : null;

        if (!isMounted) return;
        const mapped = mapRecentToVM(dashBody?.data?.recent_activity ?? [], groupId);
        setEvents(mapped);
        setStatus("ready");
      } catch (e: unknown) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Nie udało się załadować danych.");
        setErrorStatus(undefined);
      }
    }

    void fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // Realtime subscription (activities only in MVP)
  const { connectionStatus } = useDashboardRealtime(groupId, {
    onEvent: (ev) => {
      if (ev.type !== "activity_created" && ev.type !== "activity_updated") return;
      setEvents((prev) => {
        const next = [mapOneEvent(ev, groupId), ...prev];
        return next.slice(0, 50);
      });
    },
  });

  React.useEffect(() => {
    setRealtimeStatus(connectionStatus);
  }, [connectionStatus]);

  async function onRetry() {
    setStatus("idle");
    setErrorMessage(undefined);
    setErrorStatus(undefined);
    // Re-run initial effect
    // Minimal approach: just trigger by updating groupId state; instead, call fetch directly
    try {
      setStatus("loading");
      const [permRes, dashRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/permissions`),
        fetch(`/api/groups/${groupId}/dashboard?recent_limit=10`),
      ]);
      if (!permRes.ok) {
        const body = await safeJson(permRes);
        const code = permRes.status;
        let message = body?.error?.message as string | undefined;
        if (!message) {
          message =
            code === 401
              ? "Musisz być zalogowany, aby zobaczyć aktywność tej grupy."
              : code === 404
                ? "Nie znaleziono grupy lub nie masz do niej dostępu."
                : "Brak dostępu do grupy.";
        }
        setErrorStatus(code);
        setStatus("error");
        setErrorMessage(message);
        return;
      }
      const permBody = (await permRes.json()) as { data: GroupPermissionsDTO };
      const dashBody = dashRes.ok ? ((await dashRes.json()) as { data: GroupDashboardDTO }) : null;
      setPermissions(permBody.data);
      const mapped = mapRecentToVM(dashBody?.data?.recent_activity ?? [], groupId);
      setEvents(mapped);
      setStatus("ready");
    } catch (e: unknown) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Nie udało się załadować danych.");
    }
  }

  async function loadMoreDisabled() {
    if (loadingMore) return;
    setLoadingMore(true);
    // MVP: disabled/no-op. Keep for future server pagination.
    await new Promise((r) => setTimeout(r, 300));
    setLoadingMore(false);
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">Aktywność zespołu</div>
          <div className="text-sm text-muted-foreground">Ostatnie zdarzenia dotyczące zajęć</div>
        </div>
        <div className="flex items-center gap-3">
          <ActivityFeedFilters
            value={filters}
            onChange={setFilters}
            availableTypes={["activity_created", "activity_updated"] as ActivityFeedEventType[]}
          />
          <LiveIndicator status={realtimeStatus} />
        </div>
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <LoadingSkeleton rows={4} />
        ) : status === "error" ? (
          <ErrorState
            onRetry={() => {
              void onRetry();
            }}
            message={errorMessage}
          >
            {errorStatus === 401 ? (
              <a href="/auth/login" className="underline">
                Przejdź do logowania
              </a>
            ) : errorStatus === 404 ? (
              <a href="/groups" className="underline">
                Wróć do listy grup
              </a>
            ) : null}
          </ErrorState>
        ) : (
          (() => {
            const visible = applyFilters(events, filters);
            if (visible.length === 0) {
              const allDisabled = filters.types.length === 0;
              if (allDisabled) {
                return (
                  <ActivityFeedEmpty
                    filtered
                    onClearFilters={() => setFilters({ types: ["activity_created", "activity_updated"] })}
                  />
                );
              }
              // No results even with some filters: show empty without CTA
              return <ActivityFeedEmpty filtered />;
            }
            return <ActivityFeedList items={visible} />;
          })()
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          size="sm"
          variant="outline"
          disabled
          onClick={() => {
            void loadMoreDisabled();
          }}
          aria-disabled
        >
          Załaduj więcej (wkrótce)
        </Button>
      </CardFooter>
    </Card>
  );
}

function mapRecentToVM(items: GroupDashboardDTO["recent_activity"], groupId: UUID): ActivityFeedEventVM[] {
  return items.map((i) => mapOneEvent(i, groupId)).filter(Boolean) as ActivityFeedEventVM[];
}

function mapOneEvent(i: GroupDashboardDTO["recent_activity"][number], groupId: UUID): ActivityFeedEventVM | null {
  const at = safeParseDate(i.at);
  const common = {
    eventId: i.id,
    resourceType: "activity" as const,
    resourceId: i.id,
    at,
    user: { id: i.user_id },
    href: undefined as string | undefined,
  };

  if (i.type === "activity_created") {
    return {
      ...common,
      type: "activity_created",
      title: "Zajęcie utworzone",
      subtitle: `ID: ${shortId(i.id)}`,
      icon: "plus",
      href: `/groups/${groupId}/activities`,
    };
  }

  if (i.type === "activity_updated") {
    return {
      ...common,
      type: "activity_updated",
      title: "Zajęcie zaktualizowane",
      subtitle: `ID: ${shortId(i.id)}`,
      icon: "edit",
      href: `/groups/${groupId}/activities`,
    };
  }

  // Ignore unknown in MVP or render generic
  return {
    ...common,
    type: "other",
    title: i.type,
    subtitle: `ID: ${shortId(i.id)}`,
    icon: "dot",
  };
}

function shortId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function safeParseDate(iso: string): Date {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function safeJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function LiveIndicator({ status }: { status: RealtimeStatus }): JSX.Element {
  const color =
    status === "live" ? "bg-emerald-500" : status === "reconnecting" ? "bg-amber-500" : "bg-muted-foreground/50";
  const label = status === "live" ? "LIVE" : status === "reconnecting" ? "RECONNECTING" : "OFF";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
      <span aria-label={`Realtime status: ${label}`}>{label}</span>
    </span>
  );
}

function applyFilters(items: ActivityFeedEventVM[], filters: ActivityFeedFiltersVM): ActivityFeedEventVM[] {
  if (!filters.types || filters.types.length === 0) return [];
  const allowed = new Set<ActivityFeedEventType>(filters.types);
  return items.filter((i) => (i.type === "other" ? false : allowed.has(i.type)));
}

function isValidUUID(value: string): boolean {
  // RFC 4122 version-agnostic basic UUID validation
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
}
