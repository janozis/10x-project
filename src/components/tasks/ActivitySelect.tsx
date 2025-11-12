import * as React from "react";
import type { UUID } from "@/types";
import { listActivities } from "@/lib/activities/api.client";
import { Label } from "@/components/ui/label";

export interface ActivitySelectProps {
  groupId: UUID;
  value: UUID | null | undefined;
  onChange: (activityId: UUID | null) => void;
  disabled?: boolean;
}

export function ActivitySelect({ groupId, value, onChange, disabled }: ActivitySelectProps): JSX.Element {
  const [activities, setActivities] = React.useState<{ id: UUID; title: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    let cancelled = false;

    async function fetchActivities() {
      setLoading(true);
      setError(undefined);
      try {
        const result = await listActivities(groupId, { limit: 100 });
        if (cancelled) return;

        if ("error" in result) {
          setError(result.error.message);
          setActivities([]);
        } else {
          setActivities(result.data.map((a) => ({ id: a.id, title: a.title })));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Błąd pobierania aktywności");
        setActivities([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const formatActivityLabel = (id: UUID, title: string): string => {
    const shortId = id.substring(0, 5);
    return `${title} (ID: ${shortId}...)`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Powiązana aktywność</Label>
        <div className="text-sm text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Powiązana aktywność</Label>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="activity_id">Powiązana aktywność</Label>
      <select
        id="activity_id"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Brak</option>
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {formatActivityLabel(activity.id, activity.title)}
          </option>
        ))}
      </select>
    </div>
  );
}
