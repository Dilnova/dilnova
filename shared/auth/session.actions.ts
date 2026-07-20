'use server';

import { auth } from '@clerk/nextjs/server';
import { getCachedUserRole, getCachedIsSuperAdmin } from '@/shared/auth/clerk-cache';
import { getPremiumStatus } from '@/features/inventory/premium-license';

export async function getClientSessionContextAction() {
  const { orgId, orgRole, userId } = await auth();
  if (!userId) return null;

  const [userRole, isSuperAdmin] = await Promise.all([
    getCachedUserRole(userId),
    getCachedIsSuperAdmin(userId),
  ]);

  let billingActive = false;
  if (orgId) {
    const status = await getPremiumStatus(orgId);
    billingActive = status.billingActive;
  }

  const isUserVendorOrAdmin = userRole === 'vendor' || isSuperAdmin;
  let canCreateOrg = false;
  if (orgId) {
    canCreateOrg = orgRole === 'org:admin' || orgRole === 'org:member';
  } else {
    canCreateOrg = isUserVendorOrAdmin;
  }

  return {
    isSuperAdmin,
    canCreateOrg,
    billingActive,
  };
}
