import type { GroupDTO } from "@/types";
import type { GroupCardVM } from "./types";

export function mapGroupToCardVM(group: GroupDTO): GroupCardVM {
  return {
    id: group.id,
    name: group.name,
    periodLabel: `${group.start_date} — ${group.end_date}`,
    loreTheme: group.lore_theme,
    status: group.status,
    inviteCode: group.invite?.code ?? null,
    maxMembers: group.max_members ?? null,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    isArchived: group.status === "archived",
  };
}
