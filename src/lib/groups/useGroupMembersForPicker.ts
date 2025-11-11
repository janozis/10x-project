import * as React from "react";
import type { UUID, GroupMemberDTO, ApiListResponse } from "@/types";
import { listMembers } from "./members/api.client";

export interface MemberOption {
  userId: UUID;
  email: string;
  role: string;
}

export function useGroupMembersForPicker(groupId: UUID | undefined) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [members, setMembers] = React.useState<MemberOption[]>([]);

  const fetch = React.useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: ApiListResponse<GroupMemberDTO> = await listMembers(groupId);
      console.log("[useGroupMembersForPicker] API response:", res);

      if ("error" in res) {
        throw new Error(res.error.message);
      }

      console.log("[useGroupMembersForPicker] Raw data:", res.data);

      const options = res.data
        .filter((m): m is typeof m & { user_email: string } => !!m.user_email) // Only include members with email
        .map((m) => ({
          userId: m.user_id as UUID,
          email: m.user_email,
          role: m.role,
        }));

      console.log("[useGroupMembersForPicker] Mapped options:", options);
      setMembers(options);
    } catch (e: unknown) {
      console.error("[useGroupMembersForPicker] Error:", e);
      const error = e as { message?: string };
      setError(error?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    void fetch();
  }, [fetch]);

  return { members, loading, error, refresh: fetch } as const;
}
