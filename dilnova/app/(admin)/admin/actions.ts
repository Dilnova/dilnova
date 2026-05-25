'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

/**
 * Updates a member's role inside the active Clerk organization.
 * Restricted to org:admin users of that specific organization.
 */
export async function updateOrganizationMemberRole(organizationId: string, userId: string, newRole: string) {
  const { orgId, orgRole } = await auth();

  // Protect the action: caller must be an admin of this active organization
  if (orgId !== organizationId || orgRole !== 'org:admin') {
    throw new Error('Not authorized: Only administrators of this organization can change member roles.');
  }

  // Validate the requested role against the allowed whitelist to prevent role escalation/injection
  const ALLOWED_ROLES = ['org:member', 'org:admin', 'org:vendor', 'org:customer'];
  if (!ALLOWED_ROLES.includes(newRole)) {
    throw new Error(`Invalid role: Specified role "${newRole}" is not recognized.`);
  }

  const client = await clerkClient();
  await client.organizations.updateOrganizationMembership({
    organizationId,
    userId,
    role: newRole,
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}
