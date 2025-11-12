import * as React from "react";
import type { ApiList, CampDayDTO } from "@/types";

export interface DaySelectorProps {
  groupId: string;
  activeCampDayId: string;
}

const DaySelectorComponent = ({ groupId, activeCampDayId }: DaySelectorProps): JSX.Element => {
  const [days, setDays] = React.useState<CampDayDTO[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/camp-days`);
        if (!res.ok) {
          setError("Nie udało się załadować listy dni.");
          return;
        }
        const body = (await res.json()) as ApiList<CampDayDTO>;
        if (mounted) setDays(body.data);
      } catch {
        if (mounted) setError("Błąd sieci podczas ładowania dni.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [groupId]);

  return (
    <nav aria-label="Wybór dnia" className="overflow-x-auto">
      <div className="inline-flex gap-1 rounded-md border p-1">
        {days === null && !error ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 w-20 rounded bg-muted animate-pulse" />)
        ) : error ? (
          <span className="px-3 py-1.5 text-sm text-destructive">{error}</span>
        ) : days && days.length > 0 ? (
          days.map((d) => {
            const href = `/groups/${groupId}/camp-days/${d.id}`;
            const active = d.id === activeCampDayId;
            return (
              <a
                key={d.id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 text-sm rounded-md ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Dzień {d.day_number}
              </a>
            );
          })
        ) : (
          <span className="px-3 py-1.5 text-sm text-muted-foreground">Brak dni</span>
        )}
      </div>
    </nav>
  );
};

export const DaySelector = React.memo(DaySelectorComponent);
