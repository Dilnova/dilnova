import { z } from "zod/v3";

const ALLOWED_ORG_ROLES = ["org:member", "org:admin"] as const;

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required."),
  userId: z.string().min(1, "User ID is required."),
  newRole: z.enum(ALLOWED_ORG_ROLES, {
    errorMap: () => ({ message: "Invalid role specified." }),
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
