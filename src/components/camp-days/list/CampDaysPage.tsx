import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCampDaysList } from "@/lib/camp-days/useCampDaysList";
import { useGroupPermissions } from "@/lib/camp-days/useGroupPermissions";
import { cn } from "@/lib/utils";

import { CampDaysHeader } from "./CampDaysHeader";
import { CampDaysFilters } from "./CampDaysFilters";
import { CampDaysList } from "./CampDaysList";
import { CampDaysEmptyState } from "./CampDaysEmptyState";
import { CampDaysSkeleton } from "./CampDaysSkeleton";
import {
  type CampDayListItemVM,
  type CampDaysFilterState,
  mapPermissionsToActions,
  type UserActionPermissionsVM,
} from "./types";

export interface CampDaysPageProps {
  groupId: string;
}

const DEFAULT_FILTERS: CampDaysFilterState = {
  withoutActivities: false,
  searchTheme: "",
};

const CampDaysPage = ({ groupId }: CampDaysPageProps): React.ReactElement => {
  const [filters, setFilters] = React.useState<CampDaysFilterState>(DEFAULT_FILTERS);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  const {
    campDays,
    metrics,
    loading: campDaysLoading,
    error: campDaysError,
    notFound: campDaysNotFound,
    refetch: refetchCampDays,
  } = useCampDaysList(groupId);

  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
    notFound: permissionsNotFound,
    refetch: refetchPermissions,
  } = useGroupPermissions(groupId);

  const permissionsVM = React.useMemo<UserActionPermissionsVM>(
    () => mapPermissionsToActions(permissions),
    [permissions]
  );

  const isLoading = campDaysLoading || permissionsLoading;
  const errorMessage = campDaysError ?? permissionsError ?? null;
  const notFound = campDaysNotFound || permissionsNotFound;

  const handleRetry = React.useCallback(() => {
    void refetchCampDays();
    void refetchPermissions();
  }, [refetchCampDays, refetchPermissions]);

  const items = React.useMemo<CampDayListItemVM[]>(() => {
    return campDays.map((day) => {
      const metric = metrics.get(day.id);
      return {
        id: day.id,
        dayNumber: day.day_number,
        date: day.date,
        theme: day.theme,
        slotsCount: metric?.slotsCount ?? 0,
        totalMinutes: metric?.totalMinutes ?? 0,
      } satisfies CampDayListItemVM;
    });
  }, [campDays, metrics]);

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (filters.withoutActivities && item.slotsCount !== 0) return false;
      if (filters.searchTheme && item.theme) {
        const haystack = item.theme.toLocaleLowerCase("pl-PL");
        if (!haystack.includes(filters.searchTheme.trim().toLocaleLowerCase("pl-PL"))) {
          return false;
        }
      }
      if (filters.searchTheme && !item.theme) {
        return false;
      }
      return true;
    });
  }, [filters, items]);

  const handleFiltersChange = React.useCallback((next: CampDaysFilterState) => {
    setFilters(next);
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const createHref = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("redirect", "list");
    return `/groups/${groupId}/camp-days/new?${params.toString()}`;
  }, [groupId]);

  const handleOpen = React.useCallback(
    (id: string) => {
      window.location.assign(`/groups/${groupId}/camp-days/${id}`);
    },
    [groupId]
  );

  React.useEffect(() => {
    if (!notFound) return;
    const timeout = window.setTimeout(() => {
      window.location.replace("/404");
    }, 2000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [notFound]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("campDayCreateSuccess");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { message?: string; redirect?: string; campDayId?: string; at?: number };
      window.sessionStorage.removeItem("campDayCreateSuccess");
      if (parsed.redirect !== "list") return;
      const now = Date.now();
      if (parsed.at && now - parsed.at > 60_000) {
        return;
      }
      if (parsed.message) {
        toast.success(parsed.message);
      }
      if (parsed.campDayId) {
        setHighlightId(parsed.campDayId);
      }
    } catch {
      window.sessionStorage.removeItem("campDayCreateSuccess");
    }
  }, []);

  React.useEffect(() => {
    if (!highlightId) return;
    const exists = items.some((item) => item.id === highlightId);
    if (!exists) {
      setHighlightId(null);
    }
  }, [items, highlightId]);

  React.useEffect(() => {
    if (!highlightId) return;
    const timeout = window.setTimeout(() => {
      setHighlightId(null);
    }, 8000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [highlightId]);

  return (
    <section className="flex flex-col gap-6" aria-label="Zarządzanie dniami obozu" data-test-id="camp-days-page">
      <CampDaysHeader
        canManageDays={permissionsVM.canManageDays}
        hasCampDays={campDays.length > 0}
        createHref={createHref}
      />

      <CampDaysFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
        disabled={isLoading}
      />

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          data-test-id="camp-days-error-message"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <Button size="sm" variant="outline" onClick={handleRetry} data-test-id="camp-days-retry-button">
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <CampDaysSkeleton rows={6} />
      ) : filteredItems.length > 0 ? (
        <CampDaysList
          items={filteredItems}
          onOpen={handleOpen}
          highlightId={highlightId}
        />
      ) : campDays.length > 0 ? (
        <div
          className={cn(
            "rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground",
            "animate-in fade-in"
          )}
          role="status"
          data-test-id="camp-days-no-results"
        >
          Brak wyników dla wybranych filtrów.
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={handleResetFilters} data-test-id="camp-days-clear-filters-button">
              Wyczyść filtry
            </Button>
          </div>
        </div>
      ) : (
        <CampDaysEmptyState canManageDays={permissionsVM.canManageDays} createHref={createHref} />
      )}
    </section>
  );
};

export default CampDaysPage;
