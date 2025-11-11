import * as React from "react";
import type { GroupRole, UUID } from "@/types";
import { useGroupMembers, type MemberRowVM, type MembersSort } from "@/lib/groups/useGroupMembers";
import { MembersToolbar } from "./MembersToolbar";
import { GroupMembersTable } from "./GroupMembersTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";

export interface GroupMembersViewProps {
  groupId: UUID;
}

export function GroupMembersView({ groupId }: GroupMembersViewProps): JSX.Element {
  const { loading, error, rows, filters, sort, setFilters, setSort, changeRole, promote, remove, adminCount } =
    useGroupMembers(groupId);

  const [confirmState, setConfirmState] = React.useState<{ open: boolean; member?: MemberRowVM; busy?: boolean }>({
    open: false,
  });

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleChangeRole = React.useCallback(
    async (row: MemberRowVM, newRole: GroupRole) => {
      try {
        await changeRole(row.userId, newRole);
        toast.success("Zmieniono rolę");
      } catch (e: any) {
        const code = e?.body?.error?.code || e?.code;
        const msg =
          code === "LAST_ADMIN_REMOVAL"
            ? "Nie można zdegradować ostatniego administratora"
            : code === "ROLE_INVALID"
              ? "Wybrano nieprawidłową rolę"
              : code === "UNAUTHORIZED" || code === "FORBIDDEN_ROLE"
                ? "Brak uprawnień do wykonania akcji"
                : code === "NOT_FOUND"
                  ? "Grupa nie istnieje"
                  : e?.body?.error?.message || e?.message || "Nie udało się zmienić roli";
        toast.error(msg);
      }
    },
    [changeRole]
  );

  const handlePromote = React.useCallback(
    async (row: MemberRowVM) => {
      try {
        await promote(row.userId);
        toast.success("Użytkownik został administratorem");
      } catch (e: any) {
        const code = e?.body?.error?.code || e?.code;
        const msg =
          code === "UNAUTHORIZED" || code === "FORBIDDEN_ROLE"
            ? "Brak uprawnień do wykonania akcji"
            : code === "NOT_FOUND"
              ? "Grupa nie istnieje"
              : e?.body?.error?.message || e?.message || "Nie udało się promować";
        toast.error(msg);
      }
    },
    [promote]
  );

  const handleRemove = React.useCallback((row: MemberRowVM) => {
    setConfirmState({ open: true, member: row, busy: false });
  }, []);

  const confirmRemove = React.useCallback(async () => {
    const member = confirmState.member;
    if (!member) return;
    setConfirmState((s) => ({ ...s, busy: true }));
    try {
      await remove(member.userId);
      toast.success(member.isSelf ? "Opuściłeś grupę" : "Usunięto członka");
    } catch (e: any) {
      const code = e?.body?.error?.code || e?.code;
      const msg =
        code === "LAST_ADMIN_REMOVAL"
          ? "Nie można usunąć ostatniego administratora"
          : code === "UNAUTHORIZED" || code === "FORBIDDEN_ROLE"
            ? "Brak uprawnień do wykonania akcji"
            : code === "NOT_FOUND"
              ? "Grupa nie istnieje"
              : e?.body?.error?.message || e?.message || "Nie udało się usunąć";
      toast.error(msg);
    } finally {
      setConfirmState({ open: false, member: undefined, busy: false });
    }
  }, [confirmState.member, remove]);

  return (
    <section className="space-y-4" aria-labelledby="members-heading">
      <header className="flex items-center justify-between">
        <h1 id="members-heading" className="text-xl font-semibold">
          Członkowie grupy
        </h1>
        <p className="text-sm text-muted-foreground">Adminów: {adminCount}</p>
      </header>
      <MembersToolbar
        filters={filters}
        sort={sort as MembersSort}
        count={rows.length}
        onChangeFilters={setFilters}
        onChangeSort={setSort}
      />
      <GroupMembersTable
        rows={rows}
        isLoading={loading}
        sort={sort as MembersSort}
        onSortChange={setSort}
        onChangeRole={handleChangeRole}
        onPromote={handlePromote}
        onRemove={handleRemove}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((s) => ({ ...s, open }))}
        title={confirmState.member?.isSelf ? "Opuścić grupę?" : "Usunąć członka?"}
        description={
          confirmState.member?.isSelf
            ? "Po opuszczeniu grupy możesz dołączyć ponownie za pomocą zaproszenia."
            : "Usunięty użytkownik straci dostęp do aktywności i zadań tej grupy."
        }
        confirmText={confirmState.member?.isSelf ? "Opuść" : "Usuń"}
        variant="destructive"
        onConfirm={() => {
          void confirmRemove();
        }}
        loading={confirmState.busy}
      />
    </section>
  );
}
