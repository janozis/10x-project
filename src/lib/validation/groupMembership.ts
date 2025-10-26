import { z } from "zod";

// Schema for role change operations on group memberships
export const membershipRoleChangeSchema = z.object({
  role: z.enum(["admin", "editor", "member"]),
});

export type MembershipRoleChangeInput = z.infer<typeof membershipRoleChangeSchema>;
