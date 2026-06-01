'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { updateMemberRoleSchema } from '@/utils/schemas';
import { logAuditAction } from '@/utils/auditLogger';

/**
 * Updates a member's role inside the active Clerk organization.
 * Restricted to org:admin users of that specific organization.
 */
export async function updateOrganizationMemberRole(organizationId: string, userId: string, newRole: string) {
  // ── Schema Validation ──
  const parsed = updateMemberRoleSchema.safeParse({ organizationId, userId, newRole });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
  }

  const { orgId, orgRole, userId: callerId } = await auth();

  // Protect the action: caller must be an admin of this active organization
  if (orgId !== parsed.data.organizationId || orgRole !== 'org:admin') {
    throw new Error('Not authorized: Only administrators of this organization can change member roles.');
  }

  const client = await clerkClient();
  await client.organizations.updateOrganizationMembership({
    organizationId: parsed.data.organizationId,
    userId: parsed.data.userId,
    role: parsed.data.newRole,
  });

  if (callerId) {
    await logAuditAction({
      userId: callerId,
      action: 'UPDATE_MEMBER_ROLE',
      targetType: 'membership',
      targetId: parsed.data.userId,
      metadata: {
        organizationId: parsed.data.organizationId,
        newRole: parsed.data.newRole,
      },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}
