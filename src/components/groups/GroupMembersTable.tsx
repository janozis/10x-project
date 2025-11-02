import * as React from "react";
import type { UUID, GroupRole } from "@/types";
import { RoleBadge } from "./RoleBadge";
import { RoleSelect } from "./RoleSelect";
import { MemberActions } from "./MemberActions";

export type MembersSort = { by: "joined_at"; direction: "asc" | "desc" };

export interface MemberRowVM {
  userId: UUID;
  role: GroupRole;
  joinedAt: string;
  isSelf: boolean;
  isLastAdmin: boolean;
  canEditRole: boolean;
  canPromote: boolean;
  canRemove: boolean;
}

export interface GroupMembersTableProps {
  rows: MemberRowVM[];
  isLoading: boolean;
  sort: MembersSort;
  onSortChange: (patch: Partial<MembersSort>) => void;
  onChangeRole: (row: MemberRowVM, newRole: GroupRole) => void | Promise<void>;
  onPromote: (row: MemberRowVM) => void | Promise<void>;
  onRemove: (row: MemberRowVM) => void | Promise<void>;
}

export function GroupMembersTable({ rows, isLoading, sort, onSortChange, onChangeRole, onPromote, onRemove }: GroupMembersTableProps): JSX.Element {
  function toggleSort(): void {
    const next = sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ direction: next });
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Użytkownik</th>
            <th className="px-4 py-2 font-medium">Rola</th>
            <th className="px-4 py-2 font-medium">
              <button type="button" className="underline-offset-2 hover:underline" onClick={toggleSort} aria-label="Sortuj po dacie dołączenia">
                Dołączył {sort.direction === "asc" ? "↑" : "↓"}
              </button>
            </th>
            <th className="px-4 py-2 text-right font-medium">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="animate-pulse">
                <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-muted" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-muted" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-muted" /></td>
                <td className="px-4 py-3"><div className="ml-auto h-8 w-28 rounded bg-muted" /></td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>Brak członków spełniających kryteria</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.userId} className="border-t">
                <td className="px-4 py-3 font-mono text-xs sm:text-sm">{row.userId}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <RoleBadge role={row.role} />
                  <RoleSelect
                    value={row.role}
                    disabled={!row.canEditRole}
                    title={!row.canEditRole ? (row.isLastAdmin && row.role === "admin" ? "Nie można zdegradować ostatniego administratora" : "Brak uprawnień (tylko administrator)") : undefined}
                    onChange={(r) => { if (row.canEditRole) void onChangeRole(row, r); }}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(row.joinedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <MemberActions
                    canPromote={row.canPromote}
                    canRemove={row.canRemove}
                    isSelf={row.isSelf}
                    promoteDisabledReason={!row.canPromote ? (row.role === "admin" ? "Użytkownik już jest administratorem" : "Brak uprawnień (tylko administrator)") : undefined}
                    removeDisabledReason={!row.canRemove ? (row.isLastAdmin ? "Nie można usunąć ostatniego administratora" : "Brak uprawnień") : undefined}
                    onPromote={() => { if (row.canPromote) void onPromote(row); }}
                    onRemove={() => { if (row.canRemove) void onRemove(row); }}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


