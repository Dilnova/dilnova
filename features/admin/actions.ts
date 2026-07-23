"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { updateMemberRoleSchema } from "@/features/admin/schema";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";

/**
 * Updates a member's role inside the active Clerk organization.
 * Restricted to org:admin users of that specific organization.
 */
export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  newRole: string,
) {
  return runWithCorrelationId(async () => {
    await rateLimit(10, 60 * 1000, undefined, { failClosed: true });

    // ── Schema Validation ──
    const parsed = updateMemberRoleSchema.safeParse({ organizationId, userId, newRole });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input.");
    }

    const { orgId, orgRole, userId: callerId } = await auth();

    // Protect the action: caller must be an admin of this active organization
    if (orgId !== parsed.data.organizationId || orgRole !== "org:admin") {
      throw new Error(
        "Not authorized: Only administrators of this organization can change member roles.",
      );
    }

    const client = await clerkClient();

    if (parsed.data.newRole !== "org:admin") {
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: parsed.data.organizationId,
        limit: 100,
      });
      const adminCount = memberships.data.filter((m) => m.role === "org:admin").length;
      const targetIsAdmin = memberships.data.some(
        (m) => m.publicUserData?.userId === parsed.data.userId && m.role === "org:admin",
      );

      if (targetIsAdmin && adminCount <= 1) {
        throw new Error("Cannot demote the last organization admin. Promote another member first.");
      }
    }

    await client.organizations.updateOrganizationMembership({
      organizationId: parsed.data.organizationId,
      userId: parsed.data.userId,
      role: parsed.data.newRole,
    });

    if (callerId) {
      await logAuditAction({
        userId: callerId,
        action: "UPDATE_MEMBER_ROLE",
        targetType: "membership",
        targetId: parsed.data.userId,
        metadata: {
          organizationId: parsed.data.organizationId,
          newRole: parsed.data.newRole,
        },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  });
}
