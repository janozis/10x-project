import * as React from "react";
import type { UUID } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivityHeader } from "./ActivityHeader";
import { ActivityFieldsSection } from "./ActivityFieldsSection";
import { EditorsList } from "./EditorsList";
import { AIEvaluationPanel } from "./AIEvaluationPanel";
import { ActionsBar } from "./ActionsBar";
import { useActivityDetails } from "@/lib/activities/useActivityDetails";
import { useAIEvaluationRequest } from "@/lib/activities/useAIEvaluationRequest";

export interface ActivityDetailsViewProps {
  activityId: UUID;
}

export function ActivityDetailsView({ activityId }: ActivityDetailsViewProps) {
  const { loading, error, errorCode, errorStatus, vm, refresh } = useActivityDetails(activityId);
  const requestHook = useAIEvaluationRequest(activityId, {
    canRequest: vm?.computed.canRequestEvaluation ?? false,
    onRefresh: refresh,
  });

  // Check if we came from camp day view to preserve context
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const fromCampDay = urlParams?.get("from") === "camp-day";
  const campDayId = urlParams?.get("camp_day_id");
  
  // Build edit href with query params if coming from camp day
  const editHref = vm?.activity 
    ? fromCampDay && campDayId 
      ? `/activities/${vm.activity.id}/edit?from=camp-day&camp_day_id=${campDayId}`
      : `/activities/${vm.activity.id}/edit`
    : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {!loading && error ? (
        <div className="lg:col-span-3">
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm">
            {error}
            {errorStatus === 401 ? (
              <>
                {" "}
                <a href="/auth/login" className="underline">
                  Zaloguj się
                </a>
                .
              </>
            ) : null}
            {errorStatus === 403 ? (
              <>
                {" "}— Brak uprawnień do wyświetlenia tej aktywności.
              </>
            ) : null}
            {errorStatus === 404 ? (
              <>
                {" "}— Nie znaleziono aktywności.
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły aktywności</CardTitle>
            <CardDescription>
              {loading ? "Ładowanie danych…" : error ? error : vm?.activity ? vm.activity.title : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeader activity={vm?.activity} latestEvaluation={vm?.latestEvaluation ?? null} loading={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pola aktywności</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFieldsSection activity={vm?.activity} loading={loading} />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edytorzy</CardTitle>
          </CardHeader>
          <CardContent>
            <EditorsList editors={vm?.editors} loading={loading} />
          </CardContent>
        </Card>

        <AIEvaluationPanel
          activity={vm?.activity}
          evaluations={vm?.evaluations ?? []}
          canRequest={vm?.computed.canRequestEvaluation ?? false}
          cooldownRemainingSec={vm?.cooldownRemainingSec ?? 0}
          onRequestEvaluation={requestHook.request}
          loading={loading}
        />

        <ActionsBar
          canEdit={vm?.computed.canEdit ?? false}
          canRequest={vm?.computed.canRequestEvaluation ?? false}
          cooldownRemainingSec={vm?.cooldownRemainingSec ?? 0}
          onRequestEvaluation={requestHook.request}
          editHref={editHref}
        />
      </div>
    </div>
  );
}


