import * as React from "react";
import type { UUID, GroupDashboardDTO, GroupPermissionsDTO } from "@/types";
import type { DashboardTilesVM } from "@/lib/dashboard/types";
import { GroupDashboardTiles } from "@/components/groups/GroupDashboardTiles";
import { useDashboardRealtime } from "@/lib/dashboard/useDashboardRealtime";
import { mapDashboardToTilesVM } from "@/lib/mappers/dashboard-tiles.mapper";

interface Props {
  groupId: UUID;
  initialVm: DashboardTilesVM;
  permissions?: GroupPermissionsDTO | null;
}

export function GroupDashboardTilesClient({ groupId, initialVm, permissions }: Props): JSX.Element {
  const [vm, setVm] = React.useState<DashboardTilesVM>(initialVm);
  const [isFetching, setIsFetching] = React.useState(false);
  const inFlightRef = React.useRef(false);

  const fetchDashboard = React.useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetching(true);
    let attempt = 0;
    let delay = 500;
    // Simple backoff with 2 retries
    for (;;) {
      try {
        const res = await fetch(`/api/groups/${groupId}/dashboard`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: { data: GroupDashboardDTO } = await res.json();
        setVm(mapDashboardToTilesVM(body.data, permissions ?? undefined));
        break;
      } catch {
        if (attempt >= 2) break;
        await new Promise((r) => setTimeout(r, delay));
        attempt += 1;
        delay *= 2;
        continue;
      } finally {
        setIsFetching(false);
      }
    }
    inFlightRef.current = false;
  }, [groupId, permissions]);

  useDashboardRealtime(groupId, {
    onInvalidate: fetchDashboard,
  });

  return (
    <div aria-busy={isFetching}>
      <GroupDashboardTiles vm={vm} />
    </div>
  );
}
