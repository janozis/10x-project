import * as React from "react";
import type { UUID } from "@/types";
import { ActivityEditorForm } from "./ActivityEditorForm";
import { useActivity } from "@/lib/editor/useActivity";
import { getGroupPermissions } from "@/lib/groups/api.client";
import type { GroupPermissionsDTO, UUID as UuidType } from "@/types";
import { supabaseClient, DEFAULT_USER_ID } from "@/db/supabase.client";

interface ActivityEditorAppProps {
  activityId: UUID;
}

export function ActivityEditorApp({ activityId }: ActivityEditorAppProps): JSX.Element {
  const { loading, error, vm, formValues, setFormValues, editors, refresh } = useActivity(activityId);
  const [permissions, setPermissions] = React.useState<GroupPermissionsDTO | null>(null);
  const [userId, setUserId] = React.useState<UuidType | undefined>(undefined);

  // Current user id
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getUser();
        if (!mounted) return;
        setUserId((data?.user?.id as UuidType | undefined) ?? DEFAULT_USER_ID);
      } catch {
        if (!mounted) return;
        setUserId(DEFAULT_USER_ID);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch permissions when group id is known
  React.useEffect(() => {
    if (!vm?.group_id) return;
    let active = true;
    (async () => {
      try {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[ActivityEditorApp] Fetching permissions for group:", vm.group_id);
        }
        const res = await getGroupPermissions(vm.group_id);
        if (!active) return;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[ActivityEditorApp] Permissions response:", res);
        }
        if ("data" in res) setPermissions(res.data);
        else setPermissions(null);
      } catch (err) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[ActivityEditorApp] Error fetching permissions:", err);
        }
        if (!active) return;
        setPermissions(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [vm?.group_id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy>
        <div className="flex items-center gap-3">
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-20 w-full rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 w-full rounded bg-muted" />
          <div className="h-28 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3" role="alert">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
        <button
          type="button"
          className="px-3 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            void refresh();
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // Don't render form until data is loaded
  if (!formValues || !vm) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[ActivityEditorApp] Waiting for data:", { hasFormValues: !!formValues, hasVm: !!vm, loading });
    }
    return (
      <div className="space-y-4 animate-pulse" aria-busy>
        <div className="flex items-center gap-3">
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[ActivityEditorApp] Rendering form with:", {
      formValues,
      vm,
      permissions,
      userId,
      editorsCount: editors?.length,
    });
  }

  return (
    <ActivityEditorForm
      activityId={activityId}
      initialValues={formValues}
      vm={vm}
      permissions={permissions}
      userId={userId}
      editors={editors}
      onValuesChange={setFormValues}
      onRefresh={refresh}
    />
  );
}
