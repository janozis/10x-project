import * as React from "react";
import type { UUID } from "@/types";
import { useEditors } from "@/lib/editor/useEditors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGroupMembersForPicker } from "@/lib/groups/useGroupMembersForPicker";
import { UserCombobox } from "./UserCombobox";

interface EditorsManagerProps {
  activityId: UUID;
  groupId: UUID;
  canManage?: boolean;
}

export function EditorsManager({ activityId, groupId, canManage = false }: EditorsManagerProps): JSX.Element {
  const { items, loading, error, assign, remove } = useEditors(activityId);
  const { members, loading: membersLoading } = useGroupMembersForPicker(groupId);
  const [selectedUserId, setSelectedUserId] = React.useState<UUID | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Filter out members who are already assigned as editors
  const availableMembers = React.useMemo(() => {
    const editorIds = new Set(items.map((e) => e.user_id));
    return members.filter((m) => !editorIds.has(m.userId));
  }, [members, items]);

  async function handleAssign() {
    if (!selectedUserId) return;
    setProcessing(true);
    try {
      await assign(selectedUserId);
      setSelectedUserId(null);
      setLocalError(null);
      toast.success("Edytor dodany");
    } catch (e: any) {
      const code: string | undefined = e?.body?.error?.code;
      if (code === "ALREADY_ASSIGNED") setLocalError("Ten użytkownik jest już edytorem tej aktywności.");
      else if (code === "USER_NOT_IN_GROUP") setLocalError("Użytkownik nie należy do grupy tej aktywności.");
      else if (code === "FORBIDDEN_ROLE") setLocalError("Tylko administrator może zarządzać edytorami.");
      else setLocalError(e?.body?.error?.message || e?.message || "Nie udało się dodać edytora");
      toast.error("Nie udało się dodać edytora");
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemove(target: UUID) {
    setProcessing(true);
    try {
      await remove(target);
      toast.success("Edytor usunięty");
    } catch (e: any) {
      const code: string | undefined = e?.body?.error?.code;
      if (code === "FORBIDDEN_ROLE") setLocalError("Tylko administrator może zarządzać edytorami.");
      else setLocalError(e?.body?.error?.message || e?.message || "Nie udało się usunąć edytora");
      toast.error("Nie udało się usunąć edytora");
    } finally {
      setProcessing(false);
    }
  }

  // Find email for each editor from members list
  const editorsWithEmails = React.useMemo(() => {
    return items.map((editor) => {
      const member = members.find((m) => m.userId === editor.user_id);
      return {
        ...editor,
        email: member?.email || editor.user_id,
      };
    });
  }, [items, members]);

  return (
    <div className="rounded-lg border p-6 text-sm space-y-3">
      <div className="text-muted-foreground">Edytorzy przypisani do aktywności</div>
      {loading || membersLoading ? <div className="text-muted-foreground">Ładowanie…</div> : null}
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm"
        >
          {error}
        </div>
      ) : null}
      {localError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-sm"
        >
          {localError}
        </div>
      ) : null}
      <ul className="space-y-2">
        {editorsWithEmails.map((e) => (
          <li key={e.user_id} className="flex items-center justify-between rounded-md border p-2">
            <div className="flex flex-col">
              <span className="text-sm">{e.email}</span>
              <span className="text-xs text-muted-foreground font-mono">{e.user_id}</span>
            </div>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                disabled={processing}
                onClick={() => {
                  void handleRemove(e.user_id as UUID);
                }}
              >
                Usuń
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canManage ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <UserCombobox
              members={availableMembers}
              value={selectedUserId}
              onChange={setSelectedUserId}
              disabled={processing || membersLoading}
              placeholder="Wybierz użytkownika..."
            />
          </div>
          <Button
            type="button"
            disabled={processing || !selectedUserId}
            onClick={() => {
              void handleAssign();
            }}
          >
            Dodaj
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Tylko podgląd</div>
      )}
    </div>
  );
}
