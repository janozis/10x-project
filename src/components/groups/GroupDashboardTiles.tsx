import * as React from "react";
import type { DashboardTilesVM } from "@/lib/dashboard/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GroupDashboardTilesProps {
  vm: DashboardTilesVM;
}

export function GroupDashboardTiles({ vm }: GroupDashboardTilesProps): JSX.Element {
  const pct = Number.isFinite(vm.pctEvaluatedAbove7) ? Math.max(0, Math.min(100, vm.pctEvaluatedAbove7)) : 0;

  return (
    <section aria-label="Kafle metryk" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Zajęcia łącznie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold" aria-label="Liczba zajęć">
            {vm.totalActivities}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Ocenione zajęcia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold" aria-label="Liczba ocenionych zajęć">
            {vm.evaluatedActivities}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">% z oceną ≥ 7</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-semibold" aria-label="Procent powyżej 7">
              {pct}%
            </div>
          </div>
          <div
            className="mt-3 h-2 w-full rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Udział ocen powyżej 7"
          >
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Zadania</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold" aria-label="Zadania oczekujące">
              {vm.tasksPending}
            </span>
            <span className="text-sm text-muted-foreground">oczekujące</span>
          </div>
          <div className="mt-1 text-sm">
            <span className="font-medium" aria-label="Zadania ukończone">
              {vm.tasksDone}
            </span>
            <span className="text-muted-foreground"> ukończone</span>
          </div>
          {vm.canCreateTasks ? (
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <a href="#quick-task" aria-label="Dodaj nowe zadanie">
                  Dodaj zadanie
                </a>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
