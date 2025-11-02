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
      if ("error" in res) {
        throw new Error(res.error.message);
      }
      const options = res.data
        .filter((m) => m.user_email) // Only include members with email
        .map((m) => ({
          userId: m.user_id as UUID,
          email: m.user_email!,
          role: m.role,
        }));
      setMembers(options);
    } catch (e: any) {
      setError(e?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    void fetch();
  }, [fetch]);

  return { members, loading, error, refresh: fetch } as const;
}

