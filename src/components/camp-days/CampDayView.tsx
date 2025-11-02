import * as React from "react";
import type { ApiError, ApiSingle, CampDayDTO, GroupPermissionsDTO } from "@/types";
import { Card } from "@/components/ui/card";
import { DaySelector } from "@/components/camp-days/DaySelector";
import { DayHeader } from "@/components/camp-days/DayHeader";
import { ConflictsBanner } from "@/components/camp-days/ConflictsBanner";
import { SlotsList } from "@/components/camp-days/SlotsList";
import { SaveStatusBar } from "@/components/camp-days/SaveStatusBar";
import type { SlotVM } from "@/lib/camp-days/types";
import { useCampDayData } from "@/lib/camp-days/useCampDayData";
import { AddSlotButton } from "@/components/camp-days/AddSlotButton";
import { toast } from "sonner";
import { useActivitySummaries } from "@/lib/camp-days/useActivitySummaries";
import type { TimeHHMM } from "@/types";
import { minutesBetween, addMinutes } from "@/lib/camp-days/types";
import { ApplyTemplateButton } from "@/components/camp-days/ApplyTemplateButton";
import { useRealtimeCampDay } from "@/lib/camp-days/useRealtimeCampDay";
import { CampDayPageActions } from "@/components/camp-days/CampDayPageActions";
import { Button } from "@/components/ui/button";

const PERMISSIONS_FALLBACK_MESSAGE = "Nie udało się załadować uprawnień użytkownika. Część akcji może być niedostępna.";

function isApiError(payload: unknown): payload is ApiError {
  return Boolean(payload && typeof payload === "object" && "error" in payload);
}

export interface CampDayViewProps {
  groupId: string;
  campDayId: string;
  initialCampDay: CampDayDTO;
  permissions: GroupPermissionsDTO | null;
}

const CampDayViewComponent = ({
  groupId,
  campDayId,
  initialCampDay,
  permissions,
}: CampDayViewProps): React.ReactElement => {
  const [effectivePermissions, setEffectivePermissions] = React.useState<GroupPermissionsDTO | null>(
    permissions ?? null
  );
  const [permissionsState, setPermissionsState] = React.useState<"idle" | "loading" | "error">(
    permissions ? "idle" : "loading"
  );
  const [permissionsMessage, setPermissionsMessage] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  const { campDay, slots, totalMinutes, loading, error, setSlots, refresh, conflicts } = useCampDayData(
    groupId,
    campDayId,
    initialCampDay,
    effectivePermissions ?? undefined
  );

  const loadPermissions = React.useCallback(
    async (signal?: AbortSignal) => {
      setPermissionsState("loading");
      setPermissionsMessage(null);
      try {
        const response = await fetch(`/api/groups/${groupId}/permissions`, {
          method: "GET",
          credentials: "include",
          signal,
          headers: { "Content-Type": "application/json" },
        });
        const payload = (await response.json()) as ApiSingle<GroupPermissionsDTO> | ApiError;
        if (!response.ok || isApiError(payload)) {
          const message = isApiError(payload)
            ? payload.error?.message ?? PERMISSIONS_FALLBACK_MESSAGE
            : PERMISSIONS_FALLBACK_MESSAGE;
          throw new Error(message);
        }
        setEffectivePermissions(payload.data);
        setPermissionsState("idle");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : PERMISSIONS_FALLBACK_MESSAGE;
        setPermissionsState("error");
        setPermissionsMessage(message);
      }
    },
    [groupId]
  );

  React.useEffect(() => {
    setEffectivePermissions(permissions ?? null);
  }, [permissions]);

  React.useEffect(() => {
    // Always try to load permissions if not provided, even if null was passed
    // This ensures we have fresh permissions data on the client
    if (!permissions && permissionsState === "idle") {
      const controller = new AbortController();
      void loadPermissions(controller.signal);
      return () => {
        controller.abort();
      };
    }
  }, [permissions, loadPermissions, permissionsState]);

  const canEdit = Boolean(
    effectivePermissions &&
      (effectivePermissions.role === "admin" || effectivePermissions.role === "editor")
  );
  const canDelete = effectivePermissions?.role === "admin";
  const headerCampDay = campDay ?? initialCampDay;

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[CampDayView] canEdit:", canEdit, "canDelete:", canDelete, "effectivePermissions:", effectivePermissions);
    }
  }, [canEdit, canDelete, effectivePermissions]);

  const handleLocalUpdate = (id: string, partial: Partial<SlotVM>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...partial } : s)));
  };

  const handleServerApplied = (_id: string, next: SlotVM) => {
    setSlots((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };

  const handleReorder = (nextSlots: SlotVM[]) => {
    setSlots(nextSlots);
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const res = await fetch(`/api/activity-schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Nie udało się usunąć slotu");
      toast.success("Usunięto slot");
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Błąd usuwania slotu";
      toast.error(message);
    }
  };

  const handleDuplicateSlot = async (slot: SlotVM) => {
    const duration = minutesBetween(slot.startTime as TimeHHMM, slot.endTime as TimeHHMM);
    const start = slot.endTime as TimeHHMM;
    const end = addMinutes(start, duration);
    try {
      const res = await fetch(`/api/camp-days/${campDayId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: slot.activityId,
          start_time: start,
          end_time: end,
          order_in_day: slots.length + 1,
        }),
      });
      if (!res.ok) throw new Error("Nie udało się zduplikować slotu");
      await refresh();
      toast.success("Zduplikowano slot");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Błąd duplikacji";
      toast.error(message);
    }
  };

  const { load: loadSummaries } = useActivitySummaries();

  React.useEffect(() => {
    const missingIds = Array.from(new Set(slots.filter((s) => !s.activity).map((s) => s.activityId)));
    if (!missingIds.length) return;
    void (async () => {
      const cache = await loadSummaries(missingIds);
      setSlots((prev) => prev.map((s) => (s.activity ? s : { ...s, activity: cache.get(s.activityId) })));
    })();
  }, [slots, loadSummaries, setSlots]);

  useRealtimeCampDay(campDayId, () => {
    void refresh();
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let stored: { message?: string; campDayId?: string; at?: number } | null = null;
    try {
      const raw = window.sessionStorage.getItem("campDayEditSuccess");
      if (raw) {
        stored = JSON.parse(raw) as typeof stored;
      }
    } catch {
      stored = null;
    }

    if (!stored) return;

    window.sessionStorage.removeItem("campDayEditSuccess");

    if (stored.campDayId && stored.campDayId !== campDayId) {
      return;
    }

    if (stored.message) {
      toast.success(stored.message);
    }

    void refresh();
  }, [campDayId, refresh]);

  return (
    <div className="flex flex-col gap-4">
      <DaySelector groupId={groupId} activeCampDayId={campDayId} />

      <Card className="flex flex-col gap-3 p-4">
        {headerCampDay ? (
          <DayHeader campDay={headerCampDay} totalMinutes={totalMinutes} />
        ) : (
          <div className="h-12 w-full rounded-md bg-muted animate-pulse" aria-hidden="true" />
        )}
        <CampDayPageActions groupId={groupId} campDayId={campDayId} canDelete={canDelete} canEdit={canEdit} />
      </Card>

      {permissionsState === "loading" && !permissions ? (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground" role="status">
          Ładujemy uprawnienia użytkownika…
        </div>
      ) : null}

      {permissionsState === "error" ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive space-y-2"
        >
          <p>{permissionsMessage ?? PERMISSIONS_FALLBACK_MESSAGE}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void loadPermissions();
            }}
            disabled={permissionsState === "loading"}
          >
            Spróbuj ponownie
          </Button>
        </div>
      ) : null}

      {permissionsState === "idle" && !canEdit ? (
        <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground" role="note">
          Nie masz uprawnień do edycji harmonogramu. Możesz przeglądać dane, ale zmiany wymagają roli administratora
          lub edytora.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm"
        >
          {error}
        </div>
      ) : null}

      <ConflictsBanner conflicts={conflicts} />

      <section aria-label="Harmonogram dnia" className="grid gap-3">
        <div className="flex items-center justify-between">
          <ApplyTemplateButton
            groupId={groupId}
            campDayId={campDayId}
            slots={slots}
            canEdit={canEdit}
            onApplied={refresh}
          />
          <AddSlotButton
            groupId={groupId}
            campDayId={campDayId}
            slots={slots}
            canEdit={canEdit}
            onCreated={(vm) =>
              setSlots((prev) => [
                ...prev,
                {
                  ...vm,
                  orderInDay: prev.length + 1,
                  canEdit: vm.canEdit ?? canEdit,
                },
              ])
            }
          />
        </div>
        {loading ? (
          <div className="space-y-2" aria-busy={true}>
            <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
          </div>
        ) : (
          <SlotsList
            slots={slots}
            canEdit={canEdit}
            onAnyChangeState={(state) => setSaveState(state)}
            onLocalUpdate={handleLocalUpdate}
            onServerApplied={handleServerApplied}
            onDeleteSlot={handleDeleteSlot}
            onReorder={handleReorder}
            onDuplicateSlot={handleDuplicateSlot}
            groupId={groupId}
          />
        )}
      </section>

      <SaveStatusBar state={saveState} />
    </div>
  );
};

// Named export for Astro compatibility
export const CampDayView = React.memo(CampDayViewComponent);

// Also export as default for consistency with other components
export default CampDayView;
