import * as React from "react";
import type {
  ApiListResponse,
  ApiResponse,
  GroupMemberDTO,
  GroupPermissionsDTO,
  GroupRole,
  UUID,
  ApiSingle,
  ApiList,
} from "@/types";
import { supabaseClient, DEFAULT_USER_ID } from "@/db/supabase.client";
import { getGroupPermissions } from "./api.client";
import {
  listMembers as apiList,
  changeMemberRole as apiChangeRole,
  promoteMember as apiPromote,
  removeMember as apiRemove,
} from "./members/api.client";

export interface MembersFiltersVM {
  q: string;
  role?: GroupRole | "all";
}

export interface MembersSort {
  by: "joined_at";
  direction: "asc" | "desc";
}

export interface MemberRowVM {
  userId: UUID;
  role: GroupRole;
  joinedAt: string; // TimestampISO
  isSelf: boolean;
  isLastAdmin: boolean;
  canEditRole: boolean;
  canPromote: boolean;
  canRemove: boolean;
}

interface UseGroupMembersState {
  loading: boolean;
  error: string | null;
  permissions?: GroupPermissionsDTO;
  members: GroupMemberDTO[];
  currentUserId?: UUID;
}

async function resolveCurrentUserId(): Promise<UUID> {
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user?.id) return DEFAULT_USER_ID as UUID;
    return data.user.id as UUID;
  } catch {
    return DEFAULT_USER_ID as UUID;
  }
}

function toRowVM(
  m: GroupMemberDTO,
  permissions: GroupPermissionsDTO | undefined,
  currentUserId: UUID | undefined,
  adminCount: number
): MemberRowVM {
  const isSelf = Boolean(currentUserId && m.user_id === currentUserId);
  const isAdmin = m.role === "admin";
  const isLastAdmin = isAdmin && adminCount === 1;
  const userIsAdmin = permissions?.role === "admin";
  return {
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    isSelf,
    isLastAdmin,
    canEditRole: Boolean(userIsAdmin && !isLastAdmin),
    canPromote: Boolean(userIsAdmin && !isAdmin),
    canRemove: Boolean((userIsAdmin && !isLastAdmin) || (isSelf && !isLastAdmin)),
  };
}

export function useGroupMembers(groupId: UUID) {
  const [state, setState] = React.useState<UseGroupMembersState>({ loading: true, error: null, members: [] });
  const [filters, setFilters] = React.useState<MembersFiltersVM>({ q: "", role: "all" });
  const [sort, setSort] = React.useState<MembersSort>({ by: "joined_at", direction: "asc" });

  const adminCount = React.useMemo(() => state.members.filter((m) => m.role === "admin").length, [state.members]);

  const rows = React.useMemo(() => {
    const vms = state.members.map((m) => toRowVM(m, state.permissions, state.currentUserId, adminCount));
    const filtered = vms.filter((vm) => {
      if (filters.role && filters.role !== "all" && vm.role !== filters.role) return false;
      if (filters.q && !vm.userId.toLowerCase().includes(filters.q.toLowerCase())) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const cmp = a.joinedAt.localeCompare(b.joinedAt);
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [state.members, state.permissions, state.currentUserId, adminCount, filters.role, filters.q, sort.direction]);

  const refresh = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [userId, permsRes, membersRes] = await Promise.all<
        UUID,
        ApiResponse<GroupPermissionsDTO>,
        ApiListResponse<GroupMemberDTO>
      >([resolveCurrentUserId(), getGroupPermissions(groupId), apiList(groupId)]);

      const perms = (permsRes as ApiSingle<GroupPermissionsDTO>)?.data;
      const members = (membersRes as ApiList<GroupMemberDTO>)?.data ?? [];
      setState({ loading: false, error: null, permissions: perms, members, currentUserId: userId });
    } catch (e: unknown) {
      const message: string =
        (e as { body?: { error?: { message?: string } }; message?: string })?.body?.error?.message ||
        (e as { message?: string })?.message ||
        "Nie udało się załadować członków.";
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [groupId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function changeRole(userId: UUID, role: GroupRole): Promise<void> {
    // optimistic update
    const prevMembers = state.members;
    const updated = prevMembers.map((m) => (m.user_id === userId ? { ...m, role } : m));
    setState((s) => ({ ...s, members: updated }));
    try {
      const res = await apiChangeRole(groupId, userId, role);
      if ("error" in res) throw new Error(res.error.message || "Zmiana roli nie powiodła się");
      // Use returned DTO if present to keep in sync
      const dto = "data" in res ? res.data : undefined;
      if (dto) {
        setState((s) => ({ ...s, members: s.members.map((m) => (m.user_id === userId ? dto : m)) }));
      }
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        members: prevMembers,
        error:
          (e as { body?: { error?: { message?: string } }; message?: string })?.body?.error?.message ||
          (e as { message?: string })?.message ||
          "Zmiana roli nie powiodła się",
      }));
      throw e;
    }
  }

  async function promote(userId: UUID): Promise<void> {
    const prevMembers = state.members;
    const updated = prevMembers.map((m) => (m.user_id === userId ? { ...m, role: "admin" as GroupRole } : m));
    setState((s) => ({ ...s, members: updated }));
    try {
      const res = await apiPromote(groupId, userId);
      if ("error" in res) throw new Error(res.error.message || "Promocja nie powiodła się");
      const dto = "data" in res ? res.data : undefined;
      if (dto) {
        setState((s) => ({ ...s, members: s.members.map((m) => (m.user_id === userId ? dto : m)) }));
      }
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        members: prevMembers,
        error: e?.body?.error?.message || e?.message || "Promocja nie powiodła się",
      }));
      throw e;
    }
  }

  async function remove(userId: UUID): Promise<void> {
    const prevMembers = state.members;
    const updated = prevMembers.filter((m) => m.user_id !== userId);
    setState((s) => ({ ...s, members: updated }));
    try {
      await apiRemove(groupId, userId);
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        members: prevMembers,
        error: e?.body?.error?.message || e?.message || "Usunięcie nie powiodło się",
      }));
      throw e;
    }
  }

  function updateFilters(patch: Partial<MembersFiltersVM>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function updateSort(patch: Partial<MembersSort>) {
    setSort((s) => ({ ...s, ...patch }));
  }

  return {
    loading: state.loading,
    error: state.error,
    permissions: state.permissions,
    filters,
    sort,
    rows,
    adminCount,
    currentUserId: state.currentUserId,
    setFilters: updateFilters,
    setSort: updateSort,
    refresh,
    changeRole,
    promote,
    remove,
  } as const;
}
