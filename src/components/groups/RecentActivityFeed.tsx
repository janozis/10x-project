import * as React from "react";
import type { UUID, GroupDashboardDTO } from "@/types";
import { useDashboardRealtime } from "@/lib/dashboard/useDashboardRealtime";
import { Button } from "@/components/ui/button";

interface RecentActivityFeedProps {
  groupId: UUID;
  initialItems: GroupDashboardDTO["recent_activity"];
  onAnyChange?: () => void;
}

export function RecentActivityFeed({ groupId, initialItems, onAnyChange }: RecentActivityFeedProps): JSX.Element {
  const [items, setItems] = React.useState(initialItems ?? []);
  const ariaLiveRef = React.useRef<HTMLDivElement | null>(null);
  const maxItems = 50;
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const pageSize = 10;

  const { isRealtimeConnected } = useDashboardRealtime(groupId, {
    onInvalidate: () => {
      // background refetch can be done here if needed for metrics; feed updates via onEvent
      onAnyChange?.();
    },
    onEvent: (ev) => {
      setIsUpdating(true);
      setItems((prev) => {
        const next = [ev, ...prev];
        return next.slice(0, maxItems);
      });
      // announce politely
      const el = ariaLiveRef.current;
      if (el) {
        el.textContent = "Nowe zdarzenie na tablicy aktywności";
        setTimeout(() => {
          if (el) el.textContent = "";
        }, 1000);
      }
      // small visual updating indicator
      const t = setTimeout(() => setIsUpdating(false), 600);
      return () => clearTimeout(t);
    },
  });

  React.useEffect(() => {
    const t = setTimeout(() => setIsInitializing(false), 200);
    return () => clearTimeout(t);
  }, []);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const newLimit = items.length + pageSize;
      const res = await fetch(`/api/groups/${groupId}/dashboard?recent_limit=${newLimit}`);
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const body: { data: GroupDashboardDTO } = await res.json();
      const next = body.data.recent_activity ?? [];
      // If server returned same length, assume no more for now
      if (next.length <= items.length) {
        setHasMore(false);
      }
      setItems(next.slice(0, maxItems));
    } catch {
      // silent fail; keep button enabled for retry
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section aria-labelledby="recent-activity-title" className="my-6" aria-busy={isUpdating}>
      <div
        id="recent-activity-title"
        className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"
      >
        <span>Ostatnia aktywność</span>
        <span
          className={`inline-flex items-center gap-1 text-xs ${isRealtimeConnected ? "text-emerald-600" : "text-muted-foreground"}`}
        >
          <span
            className={`size-2.5 rounded-full ${isRealtimeConnected ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
          />
          {isRealtimeConnected ? "online" : "offline"}
        </span>
      </div>
      {isInitializing || isUpdating ? (
        <div className="mb-2 h-2 w-24 rounded-full bg-muted animate-pulse" aria-hidden />
      ) : null}
      <div aria-live="polite" ref={ariaLiveRef} className="sr-only" />
      {items.length === 0 ? (
        isInitializing || isUpdating ? (
          <ul className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="rounded-md border p-3">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="mt-2 h-3 w-44 rounded bg-muted animate-pulse" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">Brak aktywności.</div>
        )
      ) : (
        <ul className="space-y-2">
          {items.map((ev) => {
            const type = ev.type as string;
            const icon =
              type === "activity_created"
                ? "📝"
                : type === "activity_updated"
                  ? "✏️"
                  : type === "task_created"
                    ? "📌"
                    : type === "task_updated"
                      ? "🛠️"
                      : type === "task_done"
                        ? "✅"
                        : type === "ai_evaluated"
                          ? "🤖"
                          : "•";
            const label =
              type === "activity_created"
                ? "Dodano zajęcie"
                : type === "activity_updated"
                  ? "Zaktualizowano zajęcie"
                  : type === "task_created"
                    ? "Utworzono zadanie"
                    : type === "task_updated"
                      ? "Zaktualizowano zadanie"
                      : type === "task_done"
                        ? "Zamknięto zadanie"
                        : type === "ai_evaluated"
                          ? "Nowa ocena AI"
                          : type;
            return (
              <li key={`${ev.type}-${ev.id}-${ev.at}`} className="rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <span aria-hidden>{icon}</span>
                    <span>{label}</span>
                  </div>
                  <time className="text-muted-foreground" dateTime={ev.at}>
                    {new Date(ev.at).toLocaleString()}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && hasMore ? (
        <div className="mt-2 flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void loadMore();
            }}
            disabled={loadingMore}
            aria-disabled={loadingMore}
          >
            {loadingMore ? "Ładowanie…" : "Załaduj więcej"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
