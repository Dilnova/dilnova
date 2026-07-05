import 'server-only';
import { getCachedUserRole, getCachedIsSuperAdmin } from '@/shared/auth/clerk-cache';
import { auth } from '@clerk/nextjs/server';

/**
 * Ensures the currently authenticated user has the 'vendor' global role, is a superadmin,
 * or is an active member/admin of the organization context.
 * Users explicitly marked with the global 'customer' role are denied.
 */
export async function requireVendorRole(userId?: string) {
  const { userId: authUserId, orgId, orgRole } = await auth();
  const uid = userId || authUserId;

  if (!uid) {
    throw new Error('Not authorized: You must be signed in.');
  }

  const [userRole, isSuperAdmin] = await Promise.all([
    getCachedUserRole(uid),
    getCachedIsSuperAdmin(uid),
  ]);

  if (userRole === 'customer') {
    throw new Error('Not authorized: Customers cannot perform vendor actions.');
  }

  const isGlobalVendor = userRole === 'vendor' || isSuperAdmin;
  const isOrgVendor = orgId && (orgRole === 'org:admin' || orgRole === 'org:member');

  if (!isGlobalVendor && !isOrgVendor) {
    throw new Error('Not authorized: You do not have vendor permissions.');
  }
}
